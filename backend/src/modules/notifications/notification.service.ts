import { authConfig } from "../../config/auth.config";
import { emailConfig } from "../../config/email.config";
import { messagingConfig } from "../../config/messaging.config";
import { smsConfig } from "../../config/sms.config";
import { whatsappConfig } from "../../config/whatsapp.config";
import { logger } from "../../utils/logger";
import { normalizePhoneToE164Digits, toE164Plus } from "../../utils/phone";
import { tokenService } from "../auth/token.service";
import { emailService, type EmailService } from "../email/email.service";
import { smsService, type SmsService } from "../sms/sms.service";
import { whatsappService, type WhatsAppService } from "../whatsapp/whatsapp.service";

export interface RegistrationVerificationPayload {
  email: string;
  fullName: string;
  phone?: string | null;
  salonName: string;
  verificationUrl: string;
  otp: string;
  loginUrl: string;
}

/**
 * Multi-channel notification orchestration (email, SMS, WhatsApp).
 * Business services call this layer — never vendor SDKs directly.
 */
export class NotificationService {
  constructor(
    private readonly emails: EmailService = emailService,
    private readonly sms: SmsService = smsService,
    private readonly whatsapp: WhatsAppService = whatsappService,
  ) {}

  async sendRegistrationVerification(payload: RegistrationVerificationPayload): Promise<void> {
    const expiresMinutes = tokenService.parseDurationToMinutes(
      authConfig.emailVerificationOtpExpiresIn,
    );
    const linkExpiresHours = tokenService.parseDurationToHours(
      authConfig.emailVerificationLinkExpiresIn,
    );

    const tasks: Promise<unknown>[] = [];

    if (messagingConfig.isVerificationChannelEnabled("email")) {
      tasks.push(
        this.emails.sendEmailVerification(
          { email: payload.email, name: payload.fullName },
          {
            managerName: payload.fullName,
            salonName: payload.salonName,
            verificationUrl: payload.verificationUrl,
            otp: payload.otp,
            loginUrl: payload.loginUrl,
            supportEmail: emailConfig.supportEmail,
            linkExpiresHours,
            otpExpiresMinutes: expiresMinutes,
          },
        ),
      );
    }

    const phoneDigits = payload.phone ? normalizePhoneToE164Digits(payload.phone) : null;

    if (phoneDigits && messagingConfig.isVerificationChannelEnabled("sms")) {
      tasks.push(
        this.sms.sendOtp({
          to: toE164Plus(phoneDigits),
          otp: payload.otp,
          managerName: payload.fullName,
          salonName: payload.salonName,
          expiresMinutes,
        }),
      );
    }

    if (phoneDigits && messagingConfig.isVerificationChannelEnabled("whatsapp")) {
      tasks.push(
        this.whatsapp.sendOtp({
          to: toE164Plus(phoneDigits),
          otp: payload.otp,
          managerName: payload.fullName,
          salonName: payload.salonName,
          expiresMinutes,
        }),
      );
    }

    const results = await Promise.allSettled(tasks);

    for (const result of results) {
      if (result.status === "rejected") {
        logger.error("Verification notification channel failed", {
          reason: result.reason instanceof Error ? result.reason.message : "unknown",
        });
      }
    }

    const anyChannelConfigured =
      messagingConfig.isVerificationChannelEnabled("email") ||
      (phoneDigits && messagingConfig.isVerificationChannelEnabled("sms") && smsConfig.enabled) ||
      (phoneDigits && messagingConfig.isVerificationChannelEnabled("whatsapp") && whatsappConfig.enabled);

    if (!anyChannelConfigured) {
      logger.warn("No verification channels are enabled");
    }
  }

  getChannelStatus() {
    return {
      verificationChannels: messagingConfig.verificationChannels,
      email: { enabled: messagingConfig.isVerificationChannelEnabled("email"), configured: emailConfig.isConfigured },
      sms: { enabled: smsConfig.enabled, configured: smsConfig.isConfigured, provider: smsConfig.provider },
      whatsapp: {
        enabled: whatsappConfig.enabled,
        configured: whatsappConfig.isConfigured,
        provider: whatsappConfig.provider,
      },
      otpExpiresMinutes: authConfig.emailVerificationOtpExpiresIn,
    };
  }
}

export const notificationService = new NotificationService();
