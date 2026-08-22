import { whatsappConfig } from "../../../config/whatsapp.config";
import { normalizePhoneToE164Digits } from "../../../utils/phone";
import type { WhatsAppProvider } from "../whatsapp.provider";
import type {
  SendWhatsAppOtpInput,
  SendWhatsAppTemplateInput,
  SendWhatsAppTextInput,
  WhatsAppDeliveryResult,
} from "../whatsapp.types";

/**
 * Sparklebot WhatsApp Business API (thestarrkuts tenant).
 * POST /api/v1/{subdomain}/messages/template
 */
export class SparklebotWhatsAppProvider implements WhatsAppProvider {
  readonly name = "sparklebot";

  async sendText(_input: SendWhatsAppTextInput): Promise<WhatsAppDeliveryResult> {
    // Business-initiated chats require approved templates — free-form text is not supported.
    throw new Error(
      "Sparklebot does not support free-form WhatsApp text. Use sendTemplate() with an approved template.",
    );
  }

  async sendOtp(input: SendWhatsAppOtpInput): Promise<WhatsAppDeliveryResult> {
    const fields: string[] = [input.otp];
    if (whatsappConfig.otpBodyFieldCount >= 2) {
      fields.push(String(input.expiresMinutes ?? 10));
    }

    return this.sendTemplate({
      to: input.to,
      templateName: whatsappConfig.otpTemplateName,
      templateLanguage: whatsappConfig.otpTemplateLanguage,
      fields,
    });
  }

  async sendTemplate(input: SendWhatsAppTemplateInput): Promise<WhatsAppDeliveryResult> {
    const phone = formatSparklebotPhone(input.to);
    if (!phone) {
      throw new Error(`Invalid WhatsApp phone number: ${input.to}`);
    }

    const body: Record<string, string> = {
      phone_number: phone,
      template_name: input.templateName,
      template_language: input.templateLanguage || whatsappConfig.otpTemplateLanguage,
    };

    input.fields.forEach((value, index) => {
      body[`field_${index + 1}`] = value;
    });

    if (input.headerImageUrl) body.header_image_url = input.headerImageUrl;
    if (input.headerDocumentUrl) body.header_document_url = input.headerDocumentUrl;
    if (input.headerVideoUrl) body.header_video_url = input.headerVideoUrl;
    if (input.headerField1) body.header_field_1 = input.headerField1;
    if (input.headerText) body.header_text = input.headerText;

    const url = this.templateUrl();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${whatsappConfig.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Sparklebot WhatsApp failed (${response.status}): ${responseText}`);
    }

    return parseSparklebotSuccess(responseText, this.name);
  }

  private templateUrl(): string {
    if (whatsappConfig.apiBaseUrl?.includes("/messages/template")) {
      return whatsappConfig.apiBaseUrl;
    }

    const base = (whatsappConfig.apiBaseUrl || "https://sparklebot.in/api/v1").replace(/\/$/, "");
    const subdomain = whatsappConfig.tenantSubdomain;
    if (!subdomain) {
      throw new Error("WHATSAPP_TENANT_SUBDOMAIN is required for Sparklebot");
    }
    return `${base}/${subdomain}/messages/template`;
  }
}

function formatSparklebotPhone(raw: string): string | null {
  // Sparklebot expects digits with country code, e.g. 919581169963 (no +)
  return normalizePhoneToE164Digits(raw);
}

type SparklebotApiResponse = {
  status?: string;
  message?: string;
  data?: {
    template?: { sent?: boolean };
    whatsapp_response?: {
      messages?: Array<{ id?: string; message_status?: string }>;
    };
  };
};

function parseSparklebotSuccess(responseText: string, provider: string): WhatsAppDeliveryResult {
  let payload: SparklebotApiResponse;
  try {
    payload = JSON.parse(responseText) as SparklebotApiResponse;
  } catch {
    throw new Error(`Sparklebot returned non-JSON success body: ${responseText.slice(0, 200)}`);
  }

  if (payload.status && payload.status !== "success") {
    throw new Error(`Sparklebot WhatsApp rejected send: ${payload.message ?? responseText}`);
  }

  const waMessage = payload.data?.whatsapp_response?.messages?.[0];
  const messageStatus = waMessage?.message_status;
  if (messageStatus && messageStatus !== "accepted" && messageStatus !== "sent") {
    throw new Error(`WhatsApp message not accepted (status: ${messageStatus})`);
  }

  if (payload.data?.template?.sent === false) {
    throw new Error("Sparklebot reported template was not sent");
  }

  const messageId =
    waMessage?.id ??
    payload.data?.whatsapp_response?.messages?.[0]?.id;

  return { provider, messageId };
}
