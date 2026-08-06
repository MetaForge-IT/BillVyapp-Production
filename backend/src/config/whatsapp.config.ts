import { env } from "./env";
import { optionalEnv, parseBooleanEnv } from "./parse-env";

export const WHATSAPP_PROVIDERS = ["sparklebot", "custom", "meta", "dialog360"] as const;
export type WhatsAppProviderName = (typeof WHATSAPP_PROVIDERS)[number];

function resolveWhatsAppProvider(): WhatsAppProviderName {
  const raw = (optionalEnv("WHATSAPP_PROVIDER") || "sparklebot").trim().toLowerCase();

  if ((WHATSAPP_PROVIDERS as readonly string[]).includes(raw)) {
    return raw as WhatsAppProviderName;
  }

  // Legacy Twilio WhatsApp removed — map old values to Sparklebot
  if (raw === "twilio") {
    return "sparklebot";
  }

  throw new Error(
    `WHATSAPP_PROVIDER must be one of: ${WHATSAPP_PROVIDERS.join(", ")}. Received: ${raw}`,
  );
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

const provider = resolveWhatsAppProvider();
const enabled = parseBooleanEnv("WHATSAPP_ENABLED", false);

export const whatsappConfig = {
  enabled,
  provider,

  accessToken: optionalEnv("WHATSAPP_ACCESS_TOKEN"),
  /** Sparklebot tenant subdomain, e.g. thestarrkuts */
  tenantSubdomain: optionalEnv("WHATSAPP_TENANT_SUBDOMAIN", "thestarrkuts"),
  /** Base like https://sparklebot.in/api/v1 OR full .../messages/template URL */
  apiBaseUrl: optionalEnv("WHATSAPP_API_BASE_URL", "https://sparklebot.in/api/v1"),

  /** Legacy Meta Cloud API fields (unused when provider=sparklebot) */
  phoneNumberId: optionalEnv("WHATSAPP_PHONE_NUMBER_ID"),
  businessAccountId: optionalEnv("WHATSAPP_BUSINESS_ACCOUNT_ID"),
  apiVersion: optionalEnv("WHATSAPP_API_VERSION", "v21.0"),
  fromNumber: optionalEnv("WHATSAPP_FROM_NUMBER"),

  otpTemplateName: optionalEnv("WHATSAPP_OTP_TEMPLATE_NAME", "starrkuts_login_otp"),
  otpTemplateLanguage: optionalEnv("WHATSAPP_OTP_TEMPLATE_LANGUAGE", "en_IN"),
  /**
   * Meta AUTH templates usually have 1 body var (OTP only).
   * Set to 2 if your approved template still uses {{1}}=OTP and {{2}}=minutes.
   */
  otpBodyFieldCount: parsePositiveInt(optionalEnv("WHATSAPP_OTP_BODY_FIELD_COUNT"), 1),

  defaultTemplateLanguage: optionalEnv("WHATSAPP_TEMPLATE_LANGUAGE", "en_IN"),

  companyName: env.companyName,

  get isConfigured(): boolean {
    if (!this.enabled) {
      return false;
    }

    switch (this.provider) {
      case "sparklebot":
      case "custom":
        return Boolean(this.accessToken && (this.tenantSubdomain || this.apiBaseUrl));
      case "meta":
        return Boolean(this.accessToken && this.phoneNumberId);
      case "dialog360":
        return Boolean(this.accessToken || this.apiBaseUrl);
      default:
        return false;
    }
  },
} as const;

export type WhatsAppConfig = typeof whatsappConfig;
