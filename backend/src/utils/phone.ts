import { smsConfig } from "../config/sms.config";

/**
 * Normalizes a phone number to E.164 digits only (no + prefix).
 * Example: "98765 43210" + country 91 → "919876543210"
 */
export function normalizePhoneToE164Digits(
  phone: string,
  defaultCountryCode = smsConfig.defaultCountryCode,
): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  if (digits.length === 10 && defaultCountryCode === "91") {
    return `${defaultCountryCode}${digits}`;
  }

  if (digits.length > 10 && digits.startsWith(defaultCountryCode)) {
    return digits;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
}

export function toE164Plus(phoneDigits: string): string {
  return phoneDigits.startsWith("+") ? phoneDigits : `+${phoneDigits}`;
}
