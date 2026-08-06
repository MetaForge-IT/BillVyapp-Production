import { env } from "../../config/env";
import { whatsappConfig } from "../../config/whatsapp.config";
import { AppError } from "../../utils/errors";
import { notificationService } from "../notifications/notification.service";
import type {
  SendBirthdayOfferWhatsAppInput,
  SendCouponWhatsAppInput,
  SendFeedbackRequestWhatsAppInput,
} from "./messaging.validators";

export class MessagingService {
  private assertWhatsAppReady(): void {
    if (!whatsappConfig.enabled || !whatsappConfig.isConfigured) {
      throw new AppError(503, "WhatsApp messaging is not configured", {
        code: "WHATSAPP_NOT_CONFIGURED",
      });
    }
  }

  async sendCouponWhatsApp(input: SendCouponWhatsAppInput): Promise<{ queued: boolean }> {
    this.assertWhatsAppReady();
    try {
      await notificationService.sendCoupon({
        phone: input.phone,
        code: input.code,
        valueLabel: input.valueLabel,
        validUntil: input.validUntil,
      });
    } catch (error) {
      throw new AppError(
        502,
        error instanceof Error ? error.message : "Failed to send coupon WhatsApp",
        { code: "WHATSAPP_SEND_FAILED" },
      );
    }
    return { queued: true };
  }

  async sendFeedbackRequestWhatsApp(
    input: SendFeedbackRequestWhatsAppInput,
  ): Promise<{ queued: boolean; feedbackUrl: string }> {
    this.assertWhatsAppReady();
    const feedbackUrl =
      input.feedbackUrl?.trim() ||
      `${env.frontendUrl.replace(/\/$/, "")}/feedback`;

    try {
      await notificationService.sendFeedbackRequest({
        phone: input.phone,
        feedbackUrl,
      });
    } catch (error) {
      throw new AppError(
        502,
        error instanceof Error ? error.message : "Failed to send feedback request WhatsApp",
        { code: "WHATSAPP_SEND_FAILED" },
      );
    }

    return { queued: true, feedbackUrl };
  }

  async sendBirthdayOfferWhatsApp(
    input: SendBirthdayOfferWhatsAppInput,
  ): Promise<{ queued: boolean }> {
    this.assertWhatsAppReady();
    try {
      await notificationService.sendBirthdayOffer({
        phone: input.phone,
        customerName: input.customerName,
        offerLabel: input.offerLabel,
        validUntil: input.validUntil,
      });
    } catch (error) {
      throw new AppError(
        502,
        error instanceof Error ? error.message : "Failed to send birthday offer WhatsApp",
        { code: "WHATSAPP_SEND_FAILED" },
      );
    }
    return { queued: true };
  }
}

export const messagingService = new MessagingService();
