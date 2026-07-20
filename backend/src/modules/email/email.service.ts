import { emailConfig } from "../../config/email.config";
import { logger } from "../../utils/logger";
import type { EmailProvider } from "./email.provider";
import { smtpEmailProvider } from "./smtp.email.provider";
import { renderEmailVerificationTemplate } from "./templates/emailVerification.template";
import { renderEmailVerifiedTemplate } from "./templates/emailVerified.template";
import { renderLoginOtpTemplate } from "./templates/loginOtp.template";
import { renderPasswordChangedTemplate } from "./templates/passwordChanged.template";
import { renderPasswordResetTemplate } from "./templates/passwordReset.template";
import type {
  EmailAddress,
  EmailVerifiedTemplateData,
  EmailVerificationTemplateData,
  LoginOtpTemplateData,
  PasswordChangedTemplateData,
  PasswordResetTemplateData,
} from "./email.types";

/**
 * Application email orchestration — business logic never depends on SMTP directly.
 */
export class EmailService {
  constructor(private readonly provider: EmailProvider = smtpEmailProvider) {}

  async sendEmailVerification(
    to: EmailAddress,
    data: EmailVerificationTemplateData,
  ): Promise<void> {
    const template = renderEmailVerificationTemplate(data);
    await this.dispatch(to, template.subject, template.html, template.text);
  }

  async sendEmailVerified(to: EmailAddress, data: EmailVerifiedTemplateData): Promise<void> {
    const template = renderEmailVerifiedTemplate(data);
    await this.dispatch(to, template.subject, template.html, template.text);
  }

  async sendPasswordReset(to: EmailAddress, data: PasswordResetTemplateData): Promise<void> {
    const template = renderPasswordResetTemplate(data);
    await this.dispatch(to, template.subject, template.html, template.text);
  }

  async sendPasswordChanged(to: EmailAddress, data: PasswordChangedTemplateData): Promise<void> {
    const template = renderPasswordChangedTemplate(data);
    await this.dispatch(to, template.subject, template.html, template.text);
  }

  async sendLoginOtp(to: EmailAddress, data: LoginOtpTemplateData): Promise<void> {
    const template = renderLoginOtpTemplate(data);
    await this.dispatch(to, template.subject, template.html, template.text, {
      logOtpInDev: data.otp,
    });
  }

  buildVerificationUrl(rawToken: string): string {
    return `${emailConfig.apiPublicUrl}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
  }

  buildPasswordResetUrl(rawToken: string): string {
    return `${emailConfig.frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
  }

  buildLoginUrl(): string {
    return `${emailConfig.frontendUrl}/login`;
  }

  private async dispatch(
    to: EmailAddress,
    subject: string,
    html: string,
    text?: string,
    options?: { logOtpInDev?: string },
  ): Promise<void> {
    if (!emailConfig.isConfigured) {
      if (process.env.NODE_ENV === "development") {
        logger.warn("SMTP not configured — email not sent (development mode)", {
          to: to.email,
          subject,
          ...(options?.logOtpInDev ? { otp: options.logOtpInDev } : {}),
        });
        return;
      }

      throw new Error("Email service is not configured");
    }

    await this.provider.send({ to, subject, html, text });
  }
}

export const emailService = new EmailService();
