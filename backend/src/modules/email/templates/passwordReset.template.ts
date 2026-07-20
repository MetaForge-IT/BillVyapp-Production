import type { PasswordResetTemplateData } from "../email.types";
import { escapeHtml, renderEmailLayout } from "./layout";

export function renderPasswordResetTemplate(data: PasswordResetTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Reset your password";

  const bodyHtml = `
    <h1>Password reset requested</h1>
    <p>Hi ${escapeHtml(data.managerName)},</p>
    <p>
      We received a request to reset the password for your salon management account.
      Click the button below to choose a new password.
    </p>
    <div class="button-wrap">
      <a class="button" href="${escapeHtml(data.resetUrl)}" target="_blank" rel="noopener noreferrer">Reset Password</a>
    </div>
    <p class="muted">Or copy and paste this link into your browser:</p>
    <div class="link-box">${escapeHtml(data.resetUrl)}</div>
    <p class="muted">
      This link expires in <strong>${data.expiresHours} hour${data.expiresHours === 1 ? "" : "s"}</strong>.
      For your security, we never send passwords by email.
    </p>
    <p class="muted">If you did not request a password reset, you can safely ignore this email.</p>
  `;

  const html = renderEmailLayout({
    preheader: "Reset your salon management account password.",
    title: subject,
    bodyHtml,
  });

  const text = [
    "Password reset requested",
    "",
    `Hi ${data.managerName},`,
    "",
    `Reset link: ${data.resetUrl}`,
    "",
    `This link expires in ${data.expiresHours} hour(s).`,
    `Support: ${data.supportEmail}`,
  ].join("\n");

  return { subject, html, text };
}
