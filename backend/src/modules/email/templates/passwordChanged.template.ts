import type { PasswordChangedTemplateData } from "../email.types";
import { escapeHtml, renderEmailLayout } from "./layout";

export function renderPasswordChangedTemplate(data: PasswordChangedTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Your password was changed";

  const bodyHtml = `
    <h1>Password updated</h1>
    <p>Hi ${escapeHtml(data.managerName)},</p>
    <p>
      This is a confirmation that the password for your salon management account was changed successfully.
      All active sessions have been signed out for your security.
    </p>
    <div class="button-wrap">
      <a class="button" href="${escapeHtml(data.loginUrl)}" target="_blank" rel="noopener noreferrer">Sign In</a>
    </div>
    <p class="muted">
      If you did not make this change, contact us immediately at
      <a href="mailto:${escapeHtml(data.supportEmail)}" style="color:#D4AF37;">${escapeHtml(data.supportEmail)}</a>.
    </p>
  `;

  const html = renderEmailLayout({
    preheader: "Your account password was changed successfully.",
    title: subject,
    bodyHtml,
  });

  const text = [
    "Password changed",
    "",
    `Hi ${data.managerName},`,
    "",
    "Your password was updated successfully.",
    `Sign in: ${data.loginUrl}`,
    `Support: ${data.supportEmail}`,
  ].join("\n");

  return { subject, html, text };
}
