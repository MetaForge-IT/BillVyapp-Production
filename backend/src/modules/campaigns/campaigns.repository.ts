import type {
  Campaign,
  CampaignService,
  Coupon,
  Salon,
  Service,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError, ConflictError } from "../../utils/errors";
import type { AuthContext } from "../auth/auth.types";
import {
  CAMPAIGN_ERROR_CODES,
  CAMPAIGN_OFFER_TYPE,
  CAMPAIGN_SCOPE,
  CAMPAIGN_SEND_STATUS,
  CAMPAIGN_STATUS,
  type CampaignOfferType,
  type CampaignScope,
  type CampaignStatus,
} from "./campaigns.constants";
import type { CreateCampaignInput } from "./campaigns.validators";

type CampaignWithRelations = Campaign & {
  salon: Pick<Salon, "id" | "name" | "displayName">;
  coupon: Pick<Coupon, "id" | "code" | "title"> | null;
  services: Array<
    CampaignService & {
      service: Pick<Service, "id" | "name" | "displayName">;
    }
  >;
};

function mapOfferType(dbType: string): CampaignOfferType {
  return dbType === CAMPAIGN_OFFER_TYPE.FLAT
    ? CAMPAIGN_OFFER_TYPE.FLAT
    : CAMPAIGN_OFFER_TYPE.PERCENTAGE;
}

function mapCampaign(campaign: CampaignWithRelations) {
  return {
    id: campaign.id,
    salonId: campaign.salonId,
    salonName: campaign.salon.displayName ?? campaign.salon.name,
    title: campaign.title,
    description: campaign.description ?? "",
    offerType: mapOfferType(campaign.offerType),
    offerValue: Number(campaign.offerValue),
    applicableScope: campaign.applicableScope as CampaignScope,
    serviceIds: campaign.services.map((row) => row.serviceId),
    services: campaign.services.map((row) => ({
      id: row.service.id,
      name: row.service.name,
      displayName: row.service.displayName,
    })),
    validFrom: campaign.validFrom.toISOString().slice(0, 10),
    validTill: campaign.validTill.toISOString().slice(0, 10),
    status: campaign.status as CampaignStatus,
    generateCoupon: campaign.generateCoupon,
    couponId: campaign.couponId,
    couponCode: campaign.coupon?.code ?? null,
    sentCount: campaign.sentCount,
    failedCount: campaign.failedCount,
    sentAt: campaign.sentAt?.toISOString() ?? null,
    audienceCount: 0,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

const campaignInclude = {
  salon: { select: { id: true, name: true, displayName: true } },
  coupon: { select: { id: true, code: true, title: true } },
  services: {
    include: {
      service: { select: { id: true, name: true, displayName: true } },
    },
  },
} as const;

export class CampaignsRepository {
  async list(salonIds: string[], status?: string) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        salonId: salonIds.length === 1 ? salonIds[0] : { in: salonIds },
        ...(status ? { status } : {}),
      },
      include: campaignInclude,
      orderBy: [{ createdAt: "desc" }],
    });
    return this.withAudienceCounts(campaigns.map(mapCampaign));
  }

  async getById(salonIds: string[], campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        salonId: salonIds.length === 1 ? salonIds[0] : { in: salonIds },
      },
      include: campaignInclude,
    });
    if (!campaign) {
      throw new AppError(404, "Campaign not found", { code: CAMPAIGN_ERROR_CODES.NOT_FOUND });
    }
    const [mapped] = await this.withAudienceCounts([mapCampaign(campaign)]);
    return mapped!;
  }

  async create(auth: AuthContext, salonId: string, input: CreateCampaignInput) {
    const serviceIds = input.serviceIds ?? [];
    if (input.applicableScope === CAMPAIGN_SCOPE.SELECTED_SERVICES) {
      const services = await prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          salonId,
          deletedAt: null,
          isActive: true,
        },
        select: { id: true },
      });
      if (services.length !== serviceIds.length) {
        throw new AppError(400, "One or more selected services are invalid", {
          code: CAMPAIGN_ERROR_CODES.INVALID_SERVICES,
        });
      }
    }

    const campaign = await prisma.campaign.create({
      data: {
        salonId,
        title: input.title,
        description: input.description ?? null,
        offerType: input.offerType,
        offerValue: input.offerValue,
        applicableScope: input.applicableScope,
        validFrom: new Date(input.validFrom),
        validTill: new Date(input.validTill),
        generateCoupon: input.generateCoupon ?? true,
        status: CAMPAIGN_STATUS.DRAFT,
        createdById: auth.userId,
        ...(serviceIds.length > 0
          ? {
              services: {
                create: serviceIds.map((serviceId) => ({ serviceId })),
              },
            }
          : {}),
      },
      include: campaignInclude,
    });

    return (await this.withAudienceCounts([mapCampaign(campaign)]))[0]!;
  }

  async delete(salonIds: string[], campaignId: string) {
    const existing = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        salonId: salonIds.length === 1 ? salonIds[0] : { in: salonIds },
      },
    });
    if (!existing) {
      throw new AppError(404, "Campaign not found", { code: CAMPAIGN_ERROR_CODES.NOT_FOUND });
    }
    if (existing.status !== CAMPAIGN_STATUS.DRAFT) {
      throw new ConflictError("Only draft campaigns can be deleted");
    }
    await prisma.campaign.delete({ where: { id: campaignId } });
  }

  async markSending(campaignId: string) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CAMPAIGN_STATUS.SENDING },
    });
  }

  async attachCoupon(campaignId: string, couponId: string) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { couponId },
    });
  }

  async finalizeSend(campaignId: string, sentCount: number, failedCount: number) {
    const status =
      sentCount === 0 && failedCount > 0
        ? CAMPAIGN_STATUS.FAILED
        : CAMPAIGN_STATUS.COMPLETED;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status,
        sentCount,
        failedCount,
        sentAt: new Date(),
      },
    });
  }

  async getAudience(salonId: string): Promise<Array<{ id: string; phone: string; fullName: string }>> {
    const customers = await prisma.customer.findMany({
      where: {
        salonId,
        deletedAt: null,
        status: { not: "inactive" },
        OR: [{ phoneNormalized: { not: "" } }, { phone: { not: "" } }],
      },
      select: { id: true, phone: true, phoneNormalized: true, fullName: true },
      orderBy: { createdAt: "desc" },
    });

    return customers.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      phone: c.phoneNormalized || c.phone,
    }));
  }

  async countAudience(salonId: string): Promise<number> {
    return prisma.customer.count({
      where: {
        salonId,
        deletedAt: null,
        status: { not: "inactive" },
        OR: [{ phoneNormalized: { not: "" } }, { phone: { not: "" } }],
      },
    });
  }

  async createSendRows(
    campaignId: string,
    rows: Array<{ customerId: string; phone: string }>,
  ) {
    if (rows.length === 0) return;
    await prisma.campaignSend.createMany({
      data: rows.map((row) => ({
        campaignId,
        customerId: row.customerId,
        phone: row.phone,
        status: CAMPAIGN_SEND_STATUS.QUEUED,
      })),
    });
  }

  async updateSendResult(
    campaignId: string,
    customerId: string,
    result: {
      status: typeof CAMPAIGN_SEND_STATUS.SENT | typeof CAMPAIGN_SEND_STATUS.FAILED;
      whatsappMessageId?: string | null;
      errorMessage?: string | null;
    },
  ) {
    await prisma.campaignSend.updateMany({
      where: { campaignId, customerId },
      data: {
        status: result.status,
        whatsappMessageId: result.whatsappMessageId ?? null,
        errorMessage: result.errorMessage ?? null,
        sentAt: result.status === CAMPAIGN_SEND_STATUS.SENT ? new Date() : null,
      },
    });
  }

  async getSendStats(campaignId: string) {
    const grouped = await prisma.campaignSend.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { _all: true },
    });

    let sent = 0;
    let failed = 0;
    for (const row of grouped) {
      if (row.status === CAMPAIGN_SEND_STATUS.SENT) sent = row._count._all;
      if (row.status === CAMPAIGN_SEND_STATUS.FAILED) failed = row._count._all;
    }
    return { sent, failed };
  }

  async getCampaignRecord(salonIds: string[], campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        salonId: salonIds.length === 1 ? salonIds[0] : { in: salonIds },
      },
      include: {
        coupon: true,
        services: { include: { service: true } },
      },
    });
    if (!campaign) {
      throw new AppError(404, "Campaign not found", { code: CAMPAIGN_ERROR_CODES.NOT_FOUND });
    }
    return campaign;
  }

  private async withAudienceCounts<T extends { salonId: string; audienceCount: number }>(
    campaigns: T[],
  ): Promise<T[]> {
    if (campaigns.length === 0) return campaigns;
    const salonIds = [...new Set(campaigns.map((c) => c.salonId))];
    const counts = await prisma.customer.groupBy({
      by: ["salonId"],
      where: {
        salonId: salonIds.length === 1 ? salonIds[0] : { in: salonIds },
        deletedAt: null,
        status: { not: "inactive" },
        OR: [{ phoneNormalized: { not: "" } }, { phone: { not: "" } }],
      },
      _count: { _all: true },
    });
    const bySalon = new Map(counts.map((row) => [row.salonId, row._count._all]));
    return campaigns.map((campaign) => ({
      ...campaign,
      audienceCount: bySalon.get(campaign.salonId) ?? 0,
    }));
  }
}

export const campaignsRepository = new CampaignsRepository();
