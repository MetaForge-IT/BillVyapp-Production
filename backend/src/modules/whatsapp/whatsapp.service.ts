import { env } from "../../config/env";
import { whatsappConfig } from "../../config/whatsapp.config";
import { logger } from "../../utils/logger";
import { Dialog360WhatsAppProvider } from "./providers/dialog360.whatsapp.provider";
import { MetaWhatsAppProvider } from "./providers/meta.whatsapp.provider";
import { TwilioWhatsAppProvider } from "./providers/twilio.whatsapp.provider";
import type { WhatsAppProvider } from "./whatsapp.provider";
import type {
  SendWhatsAppOtpInput,
  SendWhatsAppTextInput,
  WhatsAppDeliveryResult,
} from "./whatsapp.types";

function createWhatsAppProvider(): WhatsAppProvider | null {
  if (!whatsappConfig.enabled) {
    return null;
  }

  switch (whatsappConfig.provider) {
    case "meta":
      return new MetaWhatsAppProvider();
    case "twilio":
      return new TwilioWhatsAppProvider();
    case "dialog360":
      return new Dialog360WhatsAppProvider();
    case "custom":
      throw new Error(
        "Custom WhatsApp provider is not implemented yet. Set WHATSAPP_PROVIDER to meta, twilio, or dialog360.",
      );
    default:
      return null;
  }
}

/**
 * Application WhatsApp orchestration — swappable provider layer.
 */
export class WhatsAppService {
  constructor(private readonly provider: WhatsAppProvider | null = createWhatsAppProvider()) {}

  async sendText(input: SendWhatsAppTextInput): Promise<WhatsAppDeliveryResult | null> {
    return this.dispatch(() => this.provider!.sendText(input));
  }

  async sendOtp(input: SendWhatsAppOtpInput): Promise<WhatsAppDeliveryResult | null> {
    return this.dispatch(() => this.provider!.sendOtp(input));
  }

  private async dispatch(
    operation: () => Promise<WhatsAppDeliveryResult>,
  ): Promise<WhatsAppDeliveryResult | null> {
    if (!whatsappConfig.enabled) {
      return null;
    }

    if (!whatsappConfig.isConfigured || !this.provider) {
      if (env.isDevelopment) {
        logger.warn("WhatsApp enabled but not fully configured — message not sent", {
          provider: whatsappConfig.provider,
        });
        return null;
      }

      throw new Error("WhatsApp service is enabled but not configured");
    }

    const result = await operation();
    logger.info("WhatsApp message sent", {
      provider: result.provider,
      messageId: result.messageId,
    });
    return result;
  }
}

export const whatsappService = new WhatsAppService();
