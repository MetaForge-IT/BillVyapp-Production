/** Product branding — platform (BillVyapp) vs client (The Starr Kuts). */
export const BRAND = {
  appName: "BillVyapp",
  clientName: "The Starr Kuts",
  clientTagline: "Power Your Business with Seamless Billing",
  platformLogo: "/billvyapp-logo.png",
  clientLogo: "/starr-kuts-logo.png",
  tagline: "Salon & Billing Platform",
  supportEmail: "support@billvyapp.com",
  website: "billvyapp.com",
  websiteUrl: "https://billvyapp.com",
  copyright: `© ${new Date().getFullYear()} BillVyapp. All rights reserved.`,
} as const;

/**
 * Public self-serve signup / “Get Started” CTAs.
 * Keep false while Super Admin creates franchises + admins; flip to true to restore public registration UI.
 */
export const SHOW_PUBLIC_SIGNUP = false;

/** Shared copy for printed / on-screen receipts */
export const RECEIPT_FOOTER = {
  thankYou: "Thank you for your visit!",
  revisit: "We look forward to seeing you again.",
  salonType: "Express Unisex Salon",
} as const;
