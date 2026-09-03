import { authConfig } from "../../config/auth.config";
import { emailConfig } from "../../config/email.config";
import { env } from "../../config/env";
import { messagingConfig } from "../../config/messaging.config";
import { whatsappConfig } from "../../config/whatsapp.config";
import { logger } from "../../utils/logger";
import { normalizePhoneToE164Digits, toE164Plus } from "../../utils/phone";
import { tokenService } from "../auth/token.service";
import { emailService, type EmailService } from "../email/email.service";
import { whatsappService, type WhatsAppService } from "../whatsapp/whatsapp.service";
import { WHATSAPP_TEMPLATES } from "../whatsapp/whatsapp.templates";

export interface RegistrationVerificationPayload {
  email: string;
  fullName: string;
  phone?: string | null;
  salonName: string;
  verificationUrl: string;
  otp: string;
  loginUrl: string;
}

export interface AppointmentWhatsAppPayload {
  phone: string;
  dateLabel: string;
  timeLabel: string;
  salonPhone?: string;
  delayLabel?: string;
  arriveEarlyMinutes?: string;
}

export interface PaymentWhatsAppPayload {
  phone: string;
  amountLabel: string;
  invoiceNo: string;
  dateLabel: string;
}

export interface FeedbackWhatsAppPayload {
  phone: string;
  feedbackUrl: string;
}

export interface StaffBookingWhatsAppPayload {
  staffPhone: string;
  staffName: string;
  customerName: string;
  dateLabel: string;
  timeLabel: string;
}

/**
 * Multi-channel notification orchestration (email, SMS, WhatsApp).
 * Business services call this layer — never vendor SDKs directly.
 */
export class NotificationService {
  constructor(
    private readonly emails: EmailService = emailService,
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

    // SMS / Twilio OTP path intentionally disabled for Starr Kuts — WhatsApp only.
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
      (phoneDigits &&
        messagingConfig.isVerificationChannelEnabled("whatsapp") &&
        whatsappConfig.enabled);

    if (!anyChannelConfigured) {
      logger.warn("No verification channels are enabled");
    }
  }

  /** Login OTP via WhatsApp (primary). */
  async sendLoginOtpWhatsApp(input: {
    phone: string;
    otp: string;
    fullName?: string;
    expiresMinutes: number;
  }): Promise<void> {
    const digits = normalizePhoneToE164Digits(input.phone);
    if (!digits) {
      throw new Error("A valid mobile number is required to send WhatsApp OTP");
    }

    const result = await this.whatsapp.sendOtp({
      to: toE164Plus(digits),
      otp: input.otp,
      managerName: input.fullName,
      expiresMinutes: input.expiresMinutes,
    });

    if (!result) {
      throw new Error("WhatsApp OTP could not be sent — check WHATSAPP_* configuration");
    }

    if (whatsappConfig.enabled && !result.messageId && result.provider !== "bullmq") {
      logger.warn("WhatsApp OTP accepted without message id", { provider: result.provider });
    }
  }

  async sendAppointmentConfirmed(payload: AppointmentWhatsAppPayload): Promise<void> {
    const fields = [payload.dateLabel, payload.timeLabel];
    if (payload.salonPhone) fields.push(payload.salonPhone);
    else fields.push(env.supportEmail || "salon");

    await this.sendNamedTemplate(payload.phone, WHATSAPP_TEMPLATES.APPT_CONFIRM, fields);
  }

  async sendAppointmentReminder(payload: AppointmentWhatsAppPayload): Promise<void> {
    await this.sendNamedTemplate(payload.phone, WHATSAPP_TEMPLATES.APPT_REMINDER, [
      payload.dateLabel,
      payload.timeLabel,
    ]);
  }

  async sendAppointmentDelay(payload: AppointmentWhatsAppPayload): Promise<void> {
    await this.sendNamedTemplate(payload.phone, WHATSAPP_TEMPLATES.APPT_DELAY, [
      payload.delayLabel || "15 minutes",
    ]);
  }

  async sendAppointmentUpcoming(payload: AppointmentWhatsAppPayload): Promise<void> {
    await this.sendNamedTemplate(payload.phone, WHATSAPP_TEMPLATES.APPT_UPCOMING, [
      payload.dateLabel,
      payload.timeLabel,
      payload.arriveEarlyMinutes || "10",
    ]);
  }

  async sendThankYouVisit(phone: string): Promise<void> {
    await this.sendNamedTemplate(phone, WHATSAPP_TEMPLATES.THANK_YOU_VISIT, []);
  }

  async sendPaymentReceived(payload: PaymentWhatsAppPayload): Promise<void> {
    await this.sendNamedTemplate(payload.phone, WHATSAPP_TEMPLATES.PAYMENT_RECEIVED, [
      payload.amountLabel,
      payload.invoiceNo,
      payload.dateLabel,
    ]);
  }

  async sendPaymentDue(payload: PaymentWhatsAppPayload): Promise<void> {
    await this.sendNamedTemplate(payload.phone, WHATSAPP_TEMPLATES.PAY_OVERDUE, [
      payload.amountLabel,
      payload.invoiceNo,
      payload.dateLabel,
    ]);
  }

  async sendPaymentOverdue(payload: PaymentWhatsAppPayload): Promise<void> {
    await this.sendNamedTemplate(payload.phone, WHATSAPP_TEMPLATES.PAYMENT_OVERDUE, [
      payload.amountLabel,
      payload.invoiceNo,
      payload.dateLabel,
    ]);
  }

  async sendFeedbackRequest(payload: FeedbackWhatsAppPayload): Promise<void> {
    await this.sendNamedTemplate(
      payload.phone,
      WHATSAPP_TEMPLATES.FEEDBACK_REQUEST,
      [payload.feedbackUrl],
      { throwOnError: true },
    );
  }

  async sendCoupon(payload: {
    phone: string;
    code: string;
    valueLabel: string;
    validUntil: string;
  }): Promise<void> {
    await this.sendNamedTemplate(
      payload.phone,
      WHATSAPP_TEMPLATES.COUPON_SEND,
      [payload.code, payload.valueLabel, payload.validUntil],
      { throwOnError: true },
    );
  }

  async sendBirthdayOffer(payload: {
    phone: string;
    customerName: string;
    offerLabel: string;
    validUntil: string;
  }): Promise<void> {
    await this.sendNamedTemplate(
      payload.phone,
      WHATSAPP_TEMPLATES.BIRTHDAY_OFFER,
      [payload.customerName, payload.offerLabel, payload.validUntil],
      { throwOnError: true },
    );
  }

  async sendCampaignOffer(payload: {
    phone: string;
    offerLabel: string;
    validUntil: string;
  }): Promise<void> {
    // Prefer Sparklebot-hosted public URL; fall back to local multipart upload.
    const headerImageUrl = whatsappConfig.campaignHeaderImageUrl?.trim() || undefined;
    const headerImageFilePath = headerImageUrl
      ? undefined
      : whatsappConfig.campaignHeaderImagePath?.trim() || undefined;

    if (!headerImageFilePath && !headerImageUrl) {
      throw new Error(
        "Campaign offer template requires WHATSAPP_CAMPAIGN_HEADER_IMAGE_URL or WHATSAPP_CAMPAIGN_HEADER_IMAGE_PATH",
      );
    }

    await this.sendNamedTemplate(
      payload.phone,
      WHATSAPP_TEMPLATES.CAMPAIGN_OFFER,
      [payload.offerLabel, payload.validUntil],
      {
        throwOnError: true,
        headerImageUrl,
        headerImageFilePath,
      },
    );
  }

  async sendStaffNewBooking(payload: StaffBookingWhatsAppPayload): Promise<void> {
    await this.sendNamedTemplate(payload.staffPhone, WHATSAPP_TEMPLATES.STAFF_NEW_BOOKING, [
      payload.staffName,
      payload.customerName,
      payload.dateLabel,
      payload.timeLabel,
    ]);
  }

  private async sendNamedTemplate(
    phone: string,
    templateName: string,
    fields: string[],
    options?: {
      throwOnError?: boolean;
      headerImageUrl?: string;
      headerImageFilePath?: string;
    },
  ): Promise<void> {
    if (!whatsappConfig.enabled) {
      if (options?.throwOnError) {
        throw new Error("WhatsApp messaging is disabled");
      }
      return;
    }

    const digits = normalizePhoneToE164Digits(phone);
    if (!digits) {
      logger.warn("Skip WhatsApp template — invalid phone", { templateName });
      if (options?.throwOnError) {
        throw new Error("Invalid phone number for WhatsApp");
      }
      return;
    }

    try {
      const result = await this.whatsapp.sendTemplate({
        to: toE164Plus(digits),
        templateName,
        templateLanguage: whatsappConfig.defaultTemplateLanguage,
        fields,
        headerImageUrl: options?.headerImageUrl,
        headerImageFilePath: options?.headerImageFilePath,
      });
      if (result?.messageId) {
        logger.info("WhatsApp template accepted", {
          templateName,
          messageId: result.messageId,
        });
      }
    } catch (error) {
      logger.error("WhatsApp template send failed", {
        templateName,
        reason: error instanceof Error ? error.message : "unknown",
      });
      if (options?.throwOnError) {
        throw error;
      }
    }
  }

  getChannelStatus() {
    return {
      verificationChannels: messagingConfig.verificationChannels,
      email: {
        enabled: messagingConfig.isVerificationChannelEnabled("email"),
        configured: emailConfig.isConfigured,
      },
      sms: {
        enabled: false,
        configured: false,
        provider: "disabled",
        note: "Twilio/SMS OTP removed — use WhatsApp",
      },
      whatsapp: {
        enabled: whatsappConfig.enabled,
        configured: whatsappConfig.isConfigured,
        provider: whatsappConfig.provider,
        otpTemplate: whatsappConfig.otpTemplateName,
      },
      otpExpiresMinutes: authConfig.emailVerificationOtpExpiresIn,
    };
  }
}

export const notificationService = new NotificationService();
