import { readFile } from "node:fs/promises";
import path from "node:path";
import { whatsappConfig } from "../../../config/whatsapp.config";
import { logger } from "../../../utils/logger";
import { normalizePhoneToE164Digits } from "../../../utils/phone";
import type { WhatsAppProvider } from "../whatsapp.provider";
import type {
  SendWhatsAppOtpInput,
  SendWhatsAppTemplateInput,
  SendWhatsAppTextInput,
  WhatsAppDeliveryResult,
} from "../whatsapp.types";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_200;

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

    const url = this.templateUrl();
    const requestBody = await buildSparklebotBody(phone, input);
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${whatsappConfig.accessToken}`,
          Accept: "application/json",
        };
        if (!(requestBody instanceof FormData)) {
          headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: requestBody instanceof FormData ? requestBody : JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        if (!response.ok) {
          throw new Error(`Sparklebot WhatsApp failed (${response.status}): ${responseText}`);
        }

        return parseSparklebotSuccess(responseText, this.name);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : "unknown";
        const retryable = isRetryableWhatsAppError(error);
        if (!retryable || attempt >= MAX_ATTEMPTS) break;

        logger.warn("Sparklebot send retrying after transient error", {
          attempt,
          templateName: input.templateName,
          reason: message,
        });
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Sparklebot WhatsApp send failed");
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

async function buildSparklebotBody(
  phone: string,
  input: SendWhatsAppTemplateInput,
): Promise<Record<string, string> | FormData> {
  const fields: Record<string, string> = {
    phone_number: phone,
    template_name: input.templateName,
    template_language: input.templateLanguage || whatsappConfig.otpTemplateLanguage,
  };

  input.fields.forEach((value, index) => {
    fields[`field_${index + 1}`] = value;
  });

  if (input.headerDocumentUrl) fields.header_document_url = input.headerDocumentUrl;
  if (input.headerVideoUrl) fields.header_video_url = input.headerVideoUrl;
  if (input.headerField1) fields.header_field_1 = input.headerField1;
  if (input.headerText) fields.header_text = input.headerText;

  if (input.headerImageFilePath) {
    const absolute = path.isAbsolute(input.headerImageFilePath)
      ? input.headerImageFilePath
      : path.resolve(process.cwd(), input.headerImageFilePath);
    const bytes = await readFile(absolute);
    const filename = path.basename(absolute);
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }
    form.append("header_image_file", new Blob([bytes], { type: mimeForFilename(filename) }), filename);
    return form;
  }

  if (input.headerImageUrl) {
    fields.header_image_url = input.headerImageUrl;
  }

  return fields;
}

function mimeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}

function formatSparklebotPhone(raw: string): string | null {
  // Sparklebot expects digits with country code, e.g. 919581169963 (no +)
  return normalizePhoneToE164Digits(raw);
}

function isRetryableWhatsAppError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  if (msg.includes("fetch failed")) return true;
  if (msg.includes("network")) return true;
  if (msg.includes("timeout")) return true;
  if (msg.includes("econnreset") || msg.includes("econnrefused") || msg.includes("enotfound")) {
    return true;
  }
  // Do not retry template validation / 4xx business errors.
  if (msg.includes("sparklebot whatsapp failed (4")) return false;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
