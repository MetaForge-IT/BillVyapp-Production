import { QueueEvents } from "bullmq";
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
  enqueueWhatsAppTemplate,
  enqueueWhatsAppText,
  getWhatsAppQueue,
  WHATSAPP_QUEUE_NAME,
} from "../../queues/whatsapp.queue";
import { getBullMqConnection, isBullMqEnabled } from "../../queues/connection";

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

    if (isBullMqEnabled() && getWhatsAppQueue()) {
      try {
        const messageId = await this.waitForOtpJob(input);
        return { provider: "bullmq", messageId };
      } catch (error) {
        logger.warn("WhatsApp OTP queue failed — falling back to direct send", {
          reason: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    return this.dispatch(() => this.provider!.sendOtp(input));
  }

  async sendTemplate(input: SendWhatsAppTemplateInput): Promise<WhatsAppDeliveryResult | null> {
    if (!this.ensureReady()) return null;

    // Fire-and-forget for billing / appointments — keep HTTP requests fast
    try {
      if (isBullMqEnabled() && getWhatsAppQueue()) {
        const queued = await enqueueWhatsAppTemplate(input);
        if (queued.queued) {
          return { provider: "bullmq", messageId: queued.jobId };
        }
      }
    } catch (error) {
      logger.warn("WhatsApp template queue unavailable — sending inline", {
        reason: error instanceof Error ? error.message : "unknown",
      });
    }

    return this.dispatch(async () => {
      if (!this.provider?.sendTemplate) {
        throw new Error(
          `WhatsApp provider "${this.provider?.name ?? "none"}" does not support templates`,
        );
      }
      return this.provider.sendTemplate(input);
    });
  }

  private async waitForOtpJob(input: SendWhatsAppOtpInput): Promise<string> {
    const connection = getBullMqConnection();
    const queue = getWhatsAppQueue();
    if (!connection || !queue) {
      throw new Error("WhatsApp queue unavailable");
    }

    const queueEvents = new QueueEvents(WHATSAPP_QUEUE_NAME, {
      connection: connection.duplicate(),
    });

    try {
      await queueEvents.waitUntilReady();
      const job = await queue.add(
        "send-otp",
        { kind: "otp", payload: input },
        {
          priority: 1,
          attempts: 3,
          backoff: { type: "exponential", delay: 1_500 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 200 },
        },
      );

      const result = (await job.waitUntilFinished(queueEvents, 20_000)) as
        | WhatsAppDeliveryResult
        | undefined;
      return result?.messageId ?? String(job.id);
    } finally {
      await queueEvents.close();
    }
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
