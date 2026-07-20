import { parseCsvEnv } from "./parse-env";
import { smsConfig } from "./sms.config";
import { whatsappConfig } from "./whatsapp.config";

export const VERIFICATION_CHANNELS = ["email", "sms", "whatsapp"] as const;
export type VerificationChannel = (typeof VERIFICATION_CHANNELS)[number];

const configuredChannels = parseCsvEnv("VERIFICATION_CHANNELS", ["email"]);

export const messagingConfig = {
  /** Channels used when sending registration / verification OTP */
  verificationChannels: configuredChannels.filter((channel): channel is VerificationChannel =>
    (VERIFICATION_CHANNELS as readonly string[]).includes(channel),
  ),

  smsEnabled: smsConfig.enabled,
  whatsappEnabled: whatsappConfig.enabled,

  isVerificationChannelEnabled(channel: VerificationChannel): boolean {
    return this.verificationChannels.includes(channel);
  },
} as const;

export type MessagingConfig = typeof messagingConfig;
