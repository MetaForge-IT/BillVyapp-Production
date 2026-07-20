import { whatsappConfig } from "../../../config/whatsapp.config";
import type { WhatsAppProvider } from "../whatsapp.provider";
import type {
  SendWhatsAppOtpInput,
  SendWhatsAppTextInput,
  WhatsAppDeliveryResult,
} from "../whatsapp.types";

/**
 * 360dialog WhatsApp Business API provider.
 * @see https://docs.360dialog.com/
 */
export class Dialog360WhatsAppProvider implements WhatsAppProvider {
  readonly name = "dialog360";

  private get baseUrl(): string {
    return whatsappConfig.apiBaseUrl || "https://waba-v2.360dialog.io";
  }

  async sendText(input: SendWhatsAppTextInput): Promise<WhatsAppDeliveryResult> {
    return this.postMessage({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.to.replace(/^\+/, ""),
      type: "text",
      text: { body: input.message },
    });
  }

  async sendOtp(input: SendWhatsAppOtpInput): Promise<WhatsAppDeliveryResult> {
    const salon = input.salonName ?? whatsappConfig.companyName;
    const expiry = String(input.expiresMinutes ?? 10);

    return this.postMessage({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: whatsappConfig.otpTemplateName,
        language: { code: whatsappConfig.otpTemplateLanguage },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: input.otp },
              { type: "text", text: salon },
              { type: "text", text: expiry },
            ],
          },
        ],
      },
    });
  }

  private async postMessage(body: Record<string, unknown>): Promise<WhatsAppDeliveryResult> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "D360-API-KEY": whatsappConfig.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`360dialog WhatsApp failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as {
      messages?: Array<{ id: string }>;
    };

    return {
      provider: this.name,
      messageId: payload.messages?.[0]?.id,
    };
  }
}
