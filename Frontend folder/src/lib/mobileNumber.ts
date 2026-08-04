import Joi from "joi";

/** Common placeholder / sequential patterns people type as dummy mobiles. */
const DUMMY_MOBILES = new Set([
  "0000000000",
  "1111111111",
  "2222222222",
  "3333333333",
  "4444444444",
  "5555555555",
  "6666666666",
  "7777777777",
  "8888888888",
  "9999999999",
  "0123456789",
  "1234567890",
  "9876543210",
  "0987654321",
  "1020304050",
  "1122334455",
  "1212121212",
  "1010101010",
]);

/**
 * Indian mobile: exactly 10 digits, starts with 6–9, rejects known dummy patterns.
 */
export const indianMobileSchema = Joi.string()
  .trim()
  .length(10)
  .pattern(/^[6-9]\d{9}$/)
  .custom((value: string, helpers) => {
    if (DUMMY_MOBILES.has(value) || /^(\d)\1{9}$/.test(value)) {
      return helpers.error("mobile.dummy");
    }
    return value;
  })
  .messages({
    "string.empty": "Mobile number is required",
    "string.length": "Enter a valid 10-digit mobile number",
    "string.pattern.base": "Enter a valid Indian mobile number starting with 6–9",
    "mobile.dummy": "Please enter a real mobile number",
  });

export type MobileValidationResult =
  | { ok: true; phone: string }
  | { ok: false; error: string };

/** Validate a 10-digit (or raw) mobile string with Joi. */
export function validateIndianMobile(value: string): MobileValidationResult {
  const digits = String(value ?? "").replace(/\D/g, "");
  const local = digits.length >= 10 ? digits.slice(-10) : digits;
  const { error, value: phone } = indianMobileSchema.validate(local, {
    abortEarly: true,
  });
  if (error) {
    return { ok: false, error: error.details[0]?.message ?? "Invalid mobile number" };
  }
  return { ok: true, phone: phone as string };
}

export function isValidIndianMobile(value: string): boolean {
  return validateIndianMobile(value).ok;
}
