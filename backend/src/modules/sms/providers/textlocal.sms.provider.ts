import { smsConfig } from "../../../config/sms.config";
import type { SmsProvider } from "../sms.provider";
import type { SendOtpSmsInput, SendSmsInput, SmsDeliveryResult } from "../sms.types";

/**
 * Textlocal SMS provider (popular in India).
 * @see https://api.textlocal.in/docs/
 */
export class TextlocalSmsProvider implements SmsProvider {
  readonly name = "textlocal";

  async sendSms(input: SendSmsInput): Promise<SmsDeliveryResult> {
    const params = new URLSearchParams({
      apikey: smsConfig.textlocalApiKey,
      numbers: input.to.replace(/^\+/, ""),
      message: input.message,
      sender: smsConfig.senderId,
    });

    const response = await fetch(`https://api.textlocal.in/send/?${params.toString()}`, {
      method: "POST",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Textlocal SMS failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as {
      status?: string;
      batch_id?: number;
      errors?: Array<{ message: string }>;
    };

    if (payload.status !== "success") {
      const reason = payload.errors?.[0]?.message ?? "Unknown Textlocal error";
      throw new Error(`Textlocal SMS failed: ${reason}`);
    }

    return { provider: this.name, messageId: payload.batch_id?.toString() };
  }

  async sendOtp(input: SendOtpSmsInput): Promise<SmsDeliveryResult> {
    const salon = input.salonName ?? smsConfig.companyName;
    const expiry = input.expiresMinutes ?? 10;
    const message = `${salon}: Your verification code is ${input.otp}. Valid for ${expiry} minutes.`;

    return this.sendSms({ to: input.to, message });
  }
}
