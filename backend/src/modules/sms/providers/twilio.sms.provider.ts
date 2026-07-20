import { smsConfig } from "../../../config/sms.config";
import type { SendOtpSmsInput, SendSmsInput, SmsDeliveryResult } from "../sms.types";
import type { SmsProvider } from "../sms.provider";

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export class TwilioSmsProvider implements SmsProvider {
  readonly name = "twilio";

  async sendSms(input: SendSmsInput): Promise<SmsDeliveryResult> {
    const accountSid = smsConfig.twilioAccountSid;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      To: input.to,
      From: smsConfig.twilioFromNumber,
      Body: input.message,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(accountSid, smsConfig.twilioAuthToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twilio SMS failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as { sid?: string };
    return { provider: this.name, messageId: payload.sid };
  }

  async sendOtp(input: SendOtpSmsInput): Promise<SmsDeliveryResult> {
    const message = buildOtpMessage(input);
    return this.sendSms({ to: input.to, message });
  }
}

function buildOtpMessage(input: SendOtpSmsInput): string {
  const salon = input.salonName ?? smsConfig.companyName;
  const expiry = input.expiresMinutes ?? 10;
  return `${salon}: Your verification code is ${input.otp}. Valid for ${expiry} minutes. Do not share this code.`;
}
