/**
 * Approved Starr Kuts / Sparklebot WhatsApp template catalog.
 * Names must match WhatsApp Business Manager exactly.
 */
export const WHATSAPP_TEMPLATES = {
  LOGIN_OTP: "starrkuts_login_otp",
  APPT_CONFIRM: "starrkuts_appt_confirm",
  APPT_REMINDER: "starrkuts_appt_reminder",
  APPT_DELAY: "starrkuts_appt_delay",
  THANK_YOU_VISIT: "starrkuts_thank_you_visit",
  APPT_UPCOMING: "starrkuts_appt_upcoming",
  LOYALTY_POINTS: "starrkuts_loyalty_points",
  MEMBER_OFFER: "starrkuts_member_offer",
  BIRTHDAY_OFFER: "starrkuts_birthday_offer",
  PAYMENT_RECEIVED: "starrkuts_payment_received",
  /** Due reminder (approved name) */
  PAY_OVERDUE: "starrkuts_pay_overdue",
  PAYMENT_OVERDUE: "starrkuts_payment_overdue",
  COUPON_SEND: "starrkuts_coupon_send",
  FEEDBACK_REQUEST: "starrkuts_feedback_request",
  STAFF_NEW_BOOKING: "starrkuts_staff_new_booking",
} as const;

export type WhatsAppTemplateKey = keyof typeof WHATSAPP_TEMPLATES;
export type WhatsAppTemplateName = (typeof WHATSAPP_TEMPLATES)[WhatsAppTemplateKey];
