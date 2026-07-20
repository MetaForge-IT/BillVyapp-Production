import type { LoginOtpTemplateData } from "../email.types";
import { escapeHtml, renderEmailLayout } from "./layout";

export function renderLoginOtpTemplate(data: LoginOtpTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Your BillVyapp login code";

  const bodyHtml = `
    <h1>Login verification</h1>
    <p>Hi ${escapeHtml(data.fullName)},</p>
    <p>
      Use this one-time code to finish signing in to BillVyapp.
      Do not share this code with anyone.
    </p>
    <div class="otp-box">
      <div class="otp-code">${escapeHtml(data.otp)}</div>
    </div>
    <p class="muted">
      This code expires in <strong>${data.otpExpiresMinutes} minutes</strong>.
    </p>
    <p>
      If you did not try to sign in, you can ignore this email.
      Your account stays secure as long as nobody else has the code.
    </p>
    <p class="muted">
      Sign in page: <a href="${escapeHtml(data.loginUrl)}" style="color:#D4AF37;">${escapeHtml(data.loginUrl)}</a>
    </p>
  `;

  const html = renderEmailLayout({
    preheader: `Your BillVyapp login code is ${data.otp}`,
    title: subject,
    bodyHtml,
  });

  const text = [
    "Login verification",
    "",
    `Hi ${data.fullName},`,
    "",
    `Your BillVyapp login code: ${data.otp}`,
    `Expires in ${data.otpExpiresMinutes} minutes.`,
    "",
    `Sign in: ${data.loginUrl}`,
    `Support: ${data.supportEmail}`,
    "",
    "If you did not try to sign in, ignore this email.",
  ].join("\n");

  return { subject, html, text };
}
