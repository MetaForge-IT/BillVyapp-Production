import { smsConfig } from "../../../config/sms.config";
import type { SmsProvider } from "../sms.provider";
import type { SendOtpSmsInput, SendSmsInput, SmsDeliveryResult } from "../sms.types";

/**
 * MSG91 SMS / OTP provider (India DLT-compliant templates).
 * @see https://docs.msg91.com/
 */
export class Msg91SmsProvider implements SmsProvider {
  readonly name = "msg91";

  async sendSms(input: SendSmsInput): Promise<SmsDeliveryResult> {
    const templateId = input.templateId ?? smsConfig.msg91DltTemplateId ?? smsConfig.otpTemplateId;
    const url = "https://control.msg91.com/api/v5/flow/";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        authkey: smsConfig.msg91AuthKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        template_id: templateId,
        short_url: "0",
        recipients: [
          {
            mobiles: input.to.replace(/^\+/, ""),
            ...input.templateVariables,
            message: input.message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MSG91 SMS failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as { type?: string; message?: string; request_id?: string };
    return { provider: this.name, messageId: payload.request_id ?? payload.message };
  }

  async sendOtp(input: SendOtpSmsInput): Promise<SmsDeliveryResult> {
    const templateId = smsConfig.otpTemplateId ?? smsConfig.msg91DltTemplateId;
    const url = "https://control.msg91.com/api/v5/otp";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        authkey: smsConfig.msg91AuthKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        template_id: templateId,
        mobile: input.to.replace(/^\+/, ""),
        otp: input.otp,
        otp_length: 6,
        otp_expiry: input.expiresMinutes ?? 10,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MSG91 OTP failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as { type?: string; request_id?: string; message?: string };
    return { provider: this.name, messageId: payload.request_id ?? payload.message };
  }
}
