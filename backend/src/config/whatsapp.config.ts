import { env } from "./env";
import { optionalEnv, parseBooleanEnv } from "./parse-env";

export const WHATSAPP_PROVIDERS = ["meta", "twilio", "dialog360", "custom"] as const;
export type WhatsAppProviderName = (typeof WHATSAPP_PROVIDERS)[number];

function resolveWhatsAppProvider(): WhatsAppProviderName {
  const raw = (optionalEnv("WHATSAPP_PROVIDER") || "meta").trim().toLowerCase();

  if ((WHATSAPP_PROVIDERS as readonly string[]).includes(raw)) {
    return raw as WhatsAppProviderName;
  }

  throw new Error(
    `WHATSAPP_PROVIDER must be one of: ${WHATSAPP_PROVIDERS.join(", ")}. Received: ${raw}`,
  );
}

const provider = resolveWhatsAppProvider();
const enabled = parseBooleanEnv("WHATSAPP_ENABLED", false);

export const whatsappConfig = {
  enabled,
  provider,

  accessToken: optionalEnv("WHATSAPP_ACCESS_TOKEN"),
  phoneNumberId: optionalEnv("WHATSAPP_PHONE_NUMBER_ID"),
  businessAccountId: optionalEnv("WHATSAPP_BUSINESS_ACCOUNT_ID"),
  apiVersion: optionalEnv("WHATSAPP_API_VERSION", "v21.0"),
  apiBaseUrl: optionalEnv("WHATSAPP_API_BASE_URL"),
  fromNumber: optionalEnv("WHATSAPP_FROM_NUMBER"),

  /** Approved template for OTP / auth messages (required for business-initiated chats) */
  otpTemplateName: optionalEnv("WHATSAPP_OTP_TEMPLATE_NAME", "verification_otp"),
  otpTemplateLanguage: optionalEnv("WHATSAPP_OTP_TEMPLATE_LANGUAGE", "en"),

  /** Twilio WhatsApp (uses SMS Twilio creds as fallback) */
  twilioAccountSid:
    optionalEnv("WHATSAPP_TWILIO_ACCOUNT_SID") || optionalEnv("SMS_TWILIO_ACCOUNT_SID") || optionalEnv("SMS_API_KEY"),
  twilioAuthToken:
    optionalEnv("WHATSAPP_TWILIO_AUTH_TOKEN") || optionalEnv("SMS_TWILIO_AUTH_TOKEN") || optionalEnv("SMS_API_SECRET"),

  companyName: env.companyName,

  get isConfigured(): boolean {
    if (!this.enabled) {
      return false;
    }

    switch (this.provider) {
      case "meta":
        return Boolean(this.accessToken && this.phoneNumberId);
      case "twilio":
        return Boolean(
          this.twilioAccountSid && this.twilioAuthToken && (this.fromNumber || this.phoneNumberId),
        );
      case "dialog360":
        return Boolean(this.accessToken || this.apiBaseUrl);
      case "custom":
        return Boolean(this.apiBaseUrl && this.accessToken);
      default:
        return false;
    }
  },
} as const;

export type WhatsAppConfig = typeof whatsappConfig;
