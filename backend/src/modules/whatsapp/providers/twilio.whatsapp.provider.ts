import { whatsappConfig } from "../../../config/whatsapp.config";
import type { WhatsAppProvider } from "../whatsapp.provider";
import type {
  SendWhatsAppOtpInput,
  SendWhatsAppTextInput,
  WhatsAppDeliveryResult,
} from "../whatsapp.types";

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

/**
 * Twilio WhatsApp API provider.
 */
export class TwilioWhatsAppProvider implements WhatsAppProvider {
  readonly name = "twilio";

  async sendText(input: SendWhatsAppTextInput): Promise<WhatsAppDeliveryResult> {
    const accountSid = whatsappConfig.twilioAccountSid;
    const from = this.resolveFromAddress();
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      To: `whatsapp:${input.to.replace(/^\+/, "")}`,
      From: from,
      Body: input.message,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(accountSid, whatsappConfig.twilioAuthToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twilio WhatsApp failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as { sid?: string };
    return { provider: this.name, messageId: payload.sid };
  }

  async sendOtp(input: SendWhatsAppOtpInput): Promise<WhatsAppDeliveryResult> {
    const salon = input.salonName ?? whatsappConfig.companyName;
    const expiry = input.expiresMinutes ?? 10;
    const message = `${salon}: Your verification code is ${input.otp}. Valid for ${expiry} minutes.`;

    return this.sendText({ to: input.to, message });
  }

  private resolveFromAddress(): string {
    const from = whatsappConfig.fromNumber || whatsappConfig.phoneNumberId;
    if (!from) {
      throw new Error("WHATSAPP_FROM_NUMBER is required for Twilio WhatsApp");
    }

    return from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  }
}
