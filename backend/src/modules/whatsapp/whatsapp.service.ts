import { env } from "../../config/env";
import { whatsappConfig } from "../../config/whatsapp.config";
import { logger } from "../../utils/logger";
import { createWhatsAppProvider } from "./whatsapp.provider-factory";
import type { WhatsAppProvider } from "./whatsapp.provider";
import type {
  SendWhatsAppOtpInput,
  SendWhatsAppTemplateInput,
  SendWhatsAppTextInput,
  WhatsAppDeliveryResult,
} from "./whatsapp.types";
import {
  enqueueWhatsAppText,
  getWhatsAppQueue,
} from "../../queues/whatsapp.queue";
import { isBullMqEnabled } from "../../queues/connection";

/**
 * Application WhatsApp orchestration — queues sends via BullMQ when Redis is available.
 */
export class WhatsAppService {
  constructor(private readonly provider: WhatsAppProvider | null = createWhatsAppProvider()) {}

  async sendText(input: SendWhatsAppTextInput): Promise<WhatsAppDeliveryResult | null> {
    if (!this.ensureReady()) return null;

    try {
      if (isBullMqEnabled() && getWhatsAppQueue()) {
        const queued = await enqueueWhatsAppText(input);
        if (queued.queued) {
          return { provider: "bullmq", messageId: queued.jobId };
        }
      }
    } catch (error) {
      logger.warn("WhatsApp text queue unavailable — sending inline", {
        reason: error instanceof Error ? error.message : "unknown",
      });
    }

    return this.dispatch(() => this.provider!.sendText(input));
  }

  async sendOtp(input: SendWhatsAppOtpInput): Promise<WhatsAppDeliveryResult | null> {
    if (!this.ensureReady()) return null;

    // Login OTP must be sent synchronously — confirm Sparklebot/Meta accepted before
    // returning the login challenge (queued sends reported success while worker lagged).
    return this.dispatch(() => this.provider!.sendOtp(input));
  }

  async sendTemplate(input: SendWhatsAppTemplateInput): Promise<WhatsAppDeliveryResult | null> {
    if (!this.ensureReady()) return null;

    // Send inline — confirm Sparklebot/Meta accepted (same fix as login OTP).
    return this.dispatch(async () => {
      if (!this.provider?.sendTemplate) {
        throw new Error(
          `WhatsApp provider "${this.provider?.name ?? "none"}" does not support templates`,
        );
      }
      return this.provider.sendTemplate(input);
    });
  }

  private ensureReady(): boolean {
    if (!whatsappConfig.enabled) {
      return false;
    }

    if (!whatsappConfig.isConfigured || !this.provider) {
      if (env.isDevelopment) {
        logger.warn("WhatsApp enabled but not fully configured — message not sent", {
          provider: whatsappConfig.provider,
        });
        return false;
      }
      throw new Error("WhatsApp service is enabled but not configured");
    }

    return true;
  }

  private async dispatch(
    operation: () => Promise<WhatsAppDeliveryResult>,
  ): Promise<WhatsAppDeliveryResult | null> {
    const result = await operation();
    logger.info("WhatsApp message sent", {
      provider: result.provider,
      messageId: result.messageId,
    });
    return result;
  }
}

export const whatsappService = new WhatsAppService();
