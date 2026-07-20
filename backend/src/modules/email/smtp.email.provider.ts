import nodemailer, { type Transporter } from "nodemailer";
import { emailConfig } from "../../config/email.config";
import { logger } from "../../utils/logger";
import type { EmailProvider } from "./email.provider";
import type { SendEmailInput } from "./email.types";

/**
 * Nodemailer SMTP transport — production-ready default provider.
 */
export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter | null = null;

  async send(input: SendEmailInput): Promise<void> {
    const transporter = this.getTransporter();

    await transporter.sendMail({
      from: {
        name: emailConfig.fromName,
        address: emailConfig.fromEmail,
      },
      to: input.to.name ? `"${input.to.name}" <${input.to.email}>` : input.to.email,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    logger.info("Email sent", { to: input.to.email, subject: input.subject });
  }

  private getTransporter(): Transporter {
    if (!emailConfig.isConfigured) {
      throw new Error(
        "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in environment variables.",
      );
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        secure: emailConfig.smtpSecure,
        auth: {
          user: emailConfig.smtpUser,
          pass: emailConfig.smtpPass,
        },
      });
    }

    return this.transporter;
  }
}

export const smtpEmailProvider = new SmtpEmailProvider();
