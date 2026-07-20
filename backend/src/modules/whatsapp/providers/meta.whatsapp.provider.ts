import { whatsappConfig } from "../../../config/whatsapp.config";
import type { WhatsAppProvider } from "../whatsapp.provider";
import type {
  SendWhatsAppOtpInput,
  SendWhatsAppTextInput,
  WhatsAppDeliveryResult,
} from "../whatsapp.types";

/**
 * Meta WhatsApp Cloud API provider.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = "meta";

  async sendText(input: SendWhatsAppTextInput): Promise<WhatsAppDeliveryResult> {
    return this.postMessage({
      messaging_product: "whatsapp",
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
    const url = `https://graph.facebook.com/${whatsappConfig.apiVersion}/${whatsappConfig.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${whatsappConfig.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Meta WhatsApp failed (${response.status}): ${errorText}`);
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
