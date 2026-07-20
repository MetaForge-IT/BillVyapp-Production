import { env } from "./env";
import { optionalEnv, parseBooleanEnv } from "./parse-env";

export const SMS_PROVIDERS = ["twilio", "msg91", "textlocal", "custom"] as const;
export type SmsProviderName = (typeof SMS_PROVIDERS)[number];

function resolveSmsProvider(): SmsProviderName {
  const raw = (
    optionalEnv("SMS_PROVIDER") ||
    optionalEnv("SMS_PROVIDER_NAME") ||
    "msg91"
  )
    .trim()
    .toLowerCase();

  if ((SMS_PROVIDERS as readonly string[]).includes(raw)) {
    return raw as SmsProviderName;
  }

  throw new Error(
    `SMS_PROVIDER must be one of: ${SMS_PROVIDERS.join(", ")}. Received: ${raw}`,
  );
}

const provider = resolveSmsProvider();
const enabled = parseBooleanEnv("SMS_ENABLED", false);

export const smsConfig = {
  enabled,
  provider,

  /** Generic credentials — used by custom/http providers */
  apiKey: optionalEnv("SMS_API_KEY"),
  apiSecret: optionalEnv("SMS_API_SECRET"),
  senderId: optionalEnv("SMS_SENDER_ID"),
  templateId: optionalEnv("SMS_TEMPLATE_ID") || optionalEnv("SMS_OTP_TEMPLATE_ID"),
  otpTemplateId: optionalEnv("SMS_OTP_TEMPLATE_ID") || optionalEnv("SMS_TEMPLATE_ID"),
  defaultCountryCode: optionalEnv("SMS_DEFAULT_COUNTRY_CODE", "91"),
  apiBaseUrl: optionalEnv("SMS_API_BASE_URL"),

  /** Twilio */
  twilioAccountSid: optionalEnv("SMS_TWILIO_ACCOUNT_SID") || optionalEnv("SMS_API_KEY"),
  twilioAuthToken: optionalEnv("SMS_TWILIO_AUTH_TOKEN") || optionalEnv("SMS_API_SECRET"),
  twilioFromNumber: optionalEnv("SMS_TWILIO_FROM_NUMBER") || optionalEnv("SMS_SENDER_ID"),

  /** MSG91 (India DLT) */
  msg91AuthKey: optionalEnv("SMS_MSG91_AUTH_KEY") || optionalEnv("SMS_API_KEY"),
  msg91Route: optionalEnv("SMS_MSG91_ROUTE", "4"),
  msg91DltTemplateId:
    optionalEnv("SMS_MSG91_DLT_TEMPLATE_ID") || optionalEnv("SMS_DLT_TEMPLATE_ID") || optionalEnv("SMS_TEMPLATE_ID"),

  /** Textlocal */
  textlocalApiKey: optionalEnv("SMS_TEXTLOCAL_API_KEY") || optionalEnv("SMS_API_KEY"),

  companyName: env.companyName,

  get isConfigured(): boolean {
    if (!this.enabled) {
      return false;
    }

    switch (this.provider) {
      case "twilio":
        return Boolean(this.twilioAccountSid && this.twilioAuthToken && this.twilioFromNumber);
      case "msg91":
        return Boolean(this.msg91AuthKey && (this.msg91DltTemplateId || this.otpTemplateId));
      case "textlocal":
        return Boolean(this.textlocalApiKey && this.senderId);
      case "custom":
        return Boolean(this.apiBaseUrl && this.apiKey);
      default:
        return false;
    }
  },
} as const;

export type SmsConfig = typeof smsConfig;
