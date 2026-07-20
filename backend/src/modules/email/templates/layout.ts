import { emailConfig } from "../../../config/email.config";

interface LayoutOptions {
  preheader: string;
  title: string;
  bodyHtml: string;
}

export function renderEmailLayout({ preheader, title, bodyHtml }: LayoutOptions): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0A0A0F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden; mso-hide: all; }
    .wrapper { width: 100%; background-color: #0A0A0F; padding: 32px 16px; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #14141C 0%, #101018 100%); border: 1px solid rgba(212,175,55,0.15); border-radius: 16px; overflow: hidden; }
    .header { padding: 28px 32px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .brand { font-size: 20px; font-weight: 700; color: #D4AF37; letter-spacing: 0.02em; }
    .tagline { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 4px; }
    .content { padding: 32px; color: rgba(255,255,255,0.88); font-size: 15px; line-height: 1.65; }
    .content h1 { margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: #FFFFFF; }
    .content p { margin: 0 0 16px; }
    .muted { color: rgba(255,255,255,0.55); font-size: 13px; }
    .button-wrap { margin: 28px 0; text-align: center; }
    .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #D4AF37 0%, #C9A227 100%); color: #0A0A0F !important; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 10px; }
    .otp-box { margin: 24px 0; padding: 20px; text-align: center; background: rgba(212,175,55,0.08); border: 1px dashed rgba(212,175,55,0.35); border-radius: 12px; }
    .otp-code { font-size: 32px; font-weight: 700; letter-spacing: 0.35em; color: #D4AF37; }
    .link-box { word-break: break-all; padding: 14px 16px; background: rgba(255,255,255,0.04); border-radius: 8px; font-size: 12px; color: rgba(255,255,255,0.65); }
    .footer { padding: 24px 32px 28px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; }
    .footer p { margin: 0 0 8px; font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.5; }
    .footer a { color: #D4AF37; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .content, .header, .footer { padding-left: 20px !important; padding-right: 20px !important; }
      .otp-code { font-size: 26px; letter-spacing: 0.2em; }
    }
  </style>
</head>
<body>
  <span class="preheader">${escapeHtml(preheader)}</span>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="brand">${escapeHtml(emailConfig.companyName)}</div>
        <div class="tagline">${escapeHtml(emailConfig.companyName)} — Salon &amp; Billing Platform</div>
      </div>
      <div class="content">
        ${bodyHtml}
      </div>
      <div class="footer">
        <p>&copy; ${year} ${escapeHtml(emailConfig.companyName)}. All rights reserved.</p>
        <p>Need help? Contact <a href="mailto:${escapeHtml(emailConfig.supportEmail)}">${escapeHtml(emailConfig.supportEmail)}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export { escapeHtml };
