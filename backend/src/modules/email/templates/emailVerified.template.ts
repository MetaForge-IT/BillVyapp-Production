import type { EmailVerifiedTemplateData } from "../email.types";
import { escapeHtml, renderEmailLayout } from "./layout";

export function renderEmailVerifiedTemplate(data: EmailVerifiedTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Email verified — ${data.salonName} is ready`;

  const bodyHtml = `
    <h1>You're all set!</h1>
    <p>Hi ${escapeHtml(data.managerName)},</p>
    <p>
      Your email has been successfully verified and your manager account for
      <strong>${escapeHtml(data.salonName)}</strong> is now active.
    </p>
    <div class="button-wrap">
      <a class="button" href="${escapeHtml(data.loginUrl)}" target="_blank" rel="noopener noreferrer">Sign In to Dashboard</a>
    </div>
    <p class="muted">
      You can now log in and start managing appointments, customers, billing, and more.
    </p>
  `;

  const html = renderEmailLayout({
    preheader: `Your email is verified. Sign in to ${data.salonName}.`,
    title: subject,
    bodyHtml,
  });

  const text = [
    `Email verified for ${data.salonName}`,
    "",
    `Hi ${data.managerName},`,
    "",
    "Your account is now active.",
    `Sign in: ${data.loginUrl}`,
    `Support: ${data.supportEmail}`,
  ].join("\n");

  return { subject, html, text };
}
