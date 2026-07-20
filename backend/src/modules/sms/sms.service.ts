import { smsConfig } from "../../config/sms.config";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { Msg91SmsProvider } from "./providers/msg91.sms.provider";
import { TextlocalSmsProvider } from "./providers/textlocal.sms.provider";
import { TwilioSmsProvider } from "./providers/twilio.sms.provider";
import type { SmsProvider } from "./sms.provider";
import type { SendOtpSmsInput, SendSmsInput, SmsDeliveryResult } from "./sms.types";

function createSmsProvider(): SmsProvider | null {
  if (!smsConfig.enabled) {
    return null;
  }

  switch (smsConfig.provider) {
    case "twilio":
      return new TwilioSmsProvider();
    case "msg91":
      return new Msg91SmsProvider();
    case "textlocal":
      return new TextlocalSmsProvider();
    case "custom":
      throw new Error("Custom SMS provider is not implemented yet. Set SMS_PROVIDER to msg91, twilio, or textlocal.");
    default:
      return null;
  }
}

/**
 * Application SMS orchestration — business logic never depends on a vendor SDK directly.
 */
export class SmsService {
  constructor(private readonly provider: SmsProvider | null = createSmsProvider()) {}

  async sendSms(input: SendSmsInput): Promise<SmsDeliveryResult | null> {
    return this.dispatch(() => this.provider!.sendSms(input));
  }

  async sendOtp(input: SendOtpSmsInput): Promise<SmsDeliveryResult | null> {
    return this.dispatch(() => this.provider!.sendOtp(input));
  }

  private async dispatch(
    operation: () => Promise<SmsDeliveryResult>,
  ): Promise<SmsDeliveryResult | null> {
    if (!smsConfig.enabled) {
      return null;
    }

    if (!smsConfig.isConfigured || !this.provider) {
      if (env.isDevelopment) {
        logger.warn("SMS enabled but not fully configured — message not sent", {
          provider: smsConfig.provider,
        });
        return null;
      }

      throw new Error("SMS service is enabled but not configured");
    }

    const result = await operation();
    logger.info("SMS sent", { provider: result.provider, messageId: result.messageId });
    return result;
  }
}

export const smsService = new SmsService();
