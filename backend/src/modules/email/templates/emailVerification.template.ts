import type { EmailVerificationTemplateData } from "../email.types";
import { escapeHtml, renderEmailLayout } from "./layout";

export function renderEmailVerificationTemplate(data: EmailVerificationTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Verify your email — ${data.salonName}`;

  const bodyHtml = `
    <h1>Welcome to ${escapeHtml(data.salonName)}</h1>
    <p>Hi ${escapeHtml(data.managerName)},</p>
    <p>
      Thank you for registering <strong>${escapeHtml(data.salonName)}</strong> on our salon management platform.
      Please verify your email address to activate your manager account and start using your dashboard.
    </p>
    <div class="button-wrap">
      <a class="button" href="${escapeHtml(data.verificationUrl)}" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
    </div>
    <p class="muted">Or copy and paste this verification link into your browser:</p>
    <div class="link-box">${escapeHtml(data.verificationUrl)}</div>
    <p><strong>Alternative:</strong> enter this 6-digit verification code on the signup page:</p>
    <div class="otp-box">
      <div class="otp-code">${escapeHtml(data.otp)}</div>
    </div>
    <p class="muted">
      The verification link expires in <strong>${data.linkExpiresHours} hours</strong>.
      The OTP expires in <strong>${data.otpExpiresMinutes} minutes</strong>.
    </p>
    <p>Once verified, you can sign in here: <a href="${escapeHtml(data.loginUrl)}" style="color:#D4AF37;">${escapeHtml(data.loginUrl)}</a></p>
    <p class="muted">If you did not create this account, you can safely ignore this email.</p>
  `;

  const html = renderEmailLayout({
    preheader: `Verify your email for ${data.salonName}. Your OTP is ${data.otp}.`,
    title: subject,
    bodyHtml,
  });

  const text = [
    `Welcome to ${data.salonName}`,
    "",
    `Hi ${data.managerName},`,
    "",
    "Please verify your email to activate your manager account.",
    "",
    `Verify link: ${data.verificationUrl}`,
    `OTP: ${data.otp}`,
    "",
    `Login: ${data.loginUrl}`,
    `Support: ${data.supportEmail}`,
    "",
    `Link expires in ${data.linkExpiresHours} hours. OTP expires in ${data.otpExpiresMinutes} minutes.`,
  ].join("\n");

  return { subject, html, text };
}
