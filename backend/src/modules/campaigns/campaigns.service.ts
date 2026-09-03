import { randomBytes } from "node:crypto";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/errors";
import { normalizePhoneToE164Digits } from "../../utils/phone";
import { resolveListSalonIds } from "../../utils/salonScope";
import type { AuthContext } from "../auth/auth.types";
import { COUPON_STATUS } from "../coupons/coupons.constants";
import { notificationService } from "../notifications/notification.service";
import {
  CAMPAIGN_ERROR_CODES,
  CAMPAIGN_OFFER_TYPE,
  CAMPAIGN_SCOPE,
  CAMPAIGN_SEND_STATUS,
  CAMPAIGN_STATUS,
} from "./campaigns.constants";
import { campaignsRepository } from "./campaigns.repository";
import type { CreateCampaignInput, ListCampaignsQuery } from "./campaigns.validators";

const SEND_CHUNK_SIZE = 1;
const SEND_GAP_MS = 400;

function formatValidUntil(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatOfferLabel(offerType: string, offerValue: number): string {
  if (offerType === CAMPAIGN_OFFER_TYPE.FLAT) {
    return `₹${Math.round(offerValue)} OFF`;
  }
  const pct = Number.isInteger(offerValue) ? String(offerValue) : offerValue.toFixed(1);
  return `${pct}% OFF`;
}

function formatCouponValueLabel(offerType: string, offerValue: number): string {
  if (offerType === CAMPAIGN_OFFER_TYPE.FLAT) {
    return `₹${Math.round(offerValue)} off`;
  }
  const pct = Number.isInteger(offerValue) ? String(offerValue) : offerValue.toFixed(1);
  return `${pct}% off`;
}

function generateCouponCode(campaignId: string): string {
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `CAMP-${campaignId.slice(0, 4).toUpperCase()}${suffix}`;
}

export class CampaignsService {
  async list(auth: AuthContext, query: ListCampaignsQuery) {
    const salonIds = await resolveListSalonIds(auth, query.salonId);
    return campaignsRepository.list(salonIds, query.status);
  }

  async getById(auth: AuthContext, campaignId: string, querySalonId?: string) {
    const salonIds = await resolveListSalonIds(auth, querySalonId);
    return campaignsRepository.getById(salonIds, campaignId);
  }

  async create(auth: AuthContext, input: CreateCampaignInput) {
    const salonIds = await resolveListSalonIds(auth, input.salonId);
    const salonId = input.salonId ?? salonIds[0]!;
    if (!salonIds.includes(salonId)) {
      throw new AppError(403, "Shop not in your franchise");
    }
    return campaignsRepository.create(auth, salonId, input);
  }

  async delete(auth: AuthContext, campaignId: string, querySalonId?: string) {
    const salonIds = await resolveListSalonIds(auth, querySalonId);
    await campaignsRepository.delete(salonIds, campaignId);
  }

  async send(auth: AuthContext, campaignId: string, querySalonId?: string) {
    const salonIds = await resolveListSalonIds(auth, querySalonId);
    const campaign = await campaignsRepository.getCampaignRecord(salonIds, campaignId);

    if (
      campaign.status !== CAMPAIGN_STATUS.DRAFT &&
      campaign.status !== CAMPAIGN_STATUS.FAILED
    ) {
      throw new AppError(409, "Campaign has already been sent", {
        code: CAMPAIGN_ERROR_CODES.ALREADY_SENT,
      });
    }

    const audience = (await campaignsRepository.getAudience(campaign.salonId)).filter((c) =>
      Boolean(normalizePhoneToE164Digits(c.phone)),
    );

    if (audience.length === 0) {
      throw new AppError(400, "No customers with valid phone numbers for this branch", {
        code: CAMPAIGN_ERROR_CODES.NO_AUDIENCE,
      });
    }

    await campaignsRepository.markSending(campaignId);

    let couponCode: string | null = campaign.coupon?.code ?? null;
    if (campaign.generateCoupon && !campaign.couponId) {
      couponCode = generateCouponCode(campaignId);
      const applicableTo =
        campaign.applicableScope === CAMPAIGN_SCOPE.ALL_SERVICES
          ? "all"
          : campaign.services.map((row) => row.serviceId).join(",");

      const coupon = await prisma.coupon.create({
        data: {
          salonId: campaign.salonId,
          code: couponCode,
          codeUpper: couponCode.toUpperCase(),
          title: campaign.title,
          description: campaign.description,
          couponType: campaign.offerType,
          value: campaign.offerValue,
          validFrom: campaign.validFrom,
          validTill: campaign.validTill,
          applicableTo,
          status: COUPON_STATUS.ACTIVE,
          createdById: auth.userId,
        },
      });
      await campaignsRepository.attachCoupon(campaignId, coupon.id);
    }

    // Fresh send log on each attempt (draft or retry after failure).
    await prisma.campaignSend.deleteMany({ where: { campaignId } });
    await campaignsRepository.createSendRows(
      campaignId,
      audience.map((c) => ({ customerId: c.id, phone: c.phone })),
    );

    const validUntil = formatValidUntil(campaign.validTill.toISOString().slice(0, 10));
    const offerLabel = formatOfferLabel(campaign.offerType, Number(campaign.offerValue));
    const couponValueLabel = formatCouponValueLabel(
      campaign.offerType,
      Number(campaign.offerValue),
    );

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < audience.length; i += SEND_CHUNK_SIZE) {
      const chunk = audience.slice(i, i + SEND_CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map(async (customer) => {
          try {
            // Always send campaign offer banner template first.
            await notificationService.sendCampaignOffer({
              phone: customer.phone,
              offerLabel,
              validUntil,
            });

            // Optionally also create/send redeemable coupon code.
            if (campaign.generateCoupon && couponCode) {
              await notificationService.sendCoupon({
                phone: customer.phone,
                code: couponCode,
                valueLabel: couponValueLabel,
                validUntil,
              });
            }

            await campaignsRepository.updateSendResult(campaignId, customer.id, {
              status: CAMPAIGN_SEND_STATUS.SENT,
            });
            return true;
          } catch (error) {
            await campaignsRepository.updateSendResult(campaignId, customer.id, {
              status: CAMPAIGN_SEND_STATUS.FAILED,
              errorMessage: error instanceof Error ? error.message : "Send failed",
            });
            return false;
          }
        }),
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) sent += 1;
        else failed += 1;
      }

      if (i + SEND_CHUNK_SIZE < audience.length) {
        await new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS));
      }
    }

    await campaignsRepository.finalizeSend(campaignId, sent, failed);

    return campaignsRepository.getById(salonIds, campaignId);
  }
}

export const campaignsService = new CampaignsService();
