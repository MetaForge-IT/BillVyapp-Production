import type { EmailVerificationTemplateData } from "../email.types";
import { escapeHtml, renderEmailLayout } from "./layout";

/**
 * Standalone welcome email template (optional post-registration nurture).
 * Primary onboarding uses the combined welcome + verification template.
 */
export function renderWelcomeTemplate(data: Pick<EmailVerificationTemplateData, "managerName" | "salonName" | "loginUrl" | "supportEmail">): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Welcome to ${data.salonName}`;

  const bodyHtml = `
    <h1>Welcome aboard!</h1>
    <p>Hi ${escapeHtml(data.managerName)},</p>
    <p>
      We&apos;re excited to have <strong>${escapeHtml(data.salonName)}</strong> on our salon management platform.
      Your workspace is being prepared and you&apos;ll be ready to manage appointments, customers, and billing soon.
    </p>
    <p class="muted">Questions? Reach us at <a href="mailto:${escapeHtml(data.supportEmail)}" style="color:#D4AF37;">${escapeHtml(data.supportEmail)}</a></p>
  `;

  const html = renderEmailLayout({
    preheader: `Welcome to ${data.salonName}.`,
    title: subject,
    bodyHtml,
  });

  const text = [
    `Welcome to ${data.salonName}`,
    "",
    `Hi ${data.managerName},`,
    "",
    `Support: ${data.supportEmail}`,
    `Login: ${data.loginUrl}`,
  ].join("\n");

  return { subject, html, text };
}
