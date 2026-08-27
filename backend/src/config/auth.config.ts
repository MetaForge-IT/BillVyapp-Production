import { env } from "./env";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function parsePositiveInt(value: string, key: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Environment variable ${key} must be a positive integer`);
  }
  return parsed;
}

function parseBoolean(value: string, key: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  throw new Error(`Environment variable ${key} must be "true" or "false"`);
}

function parseSameSite(value: string): "strict" | "lax" | "none" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "strict" || normalized === "lax" || normalized === "none") {
    return normalized;
  }
  throw new Error('REFRESH_COOKIE_SAME_SITE must be "strict", "lax", or "none"');
}

export const authConfig = {
  jwtAccessSecret: requireEnv("JWT_ACCESS_SECRET"),
  jwtAccessExpiresIn: optionalEnv("JWT_ACCESS_EXPIRES_IN", "15m"),
  jwtRefreshExpiresIn: optionalEnv("JWT_REFRESH_EXPIRES_IN", "7d"),
  jwtRefreshRememberExpiresIn: optionalEnv("JWT_REFRESH_REMEMBER_EXPIRES_IN", "30d"),
  passwordResetExpiresIn: optionalEnv("PASSWORD_RESET_EXPIRES_IN", "1h"),
  emailVerificationLinkExpiresIn: optionalEnv("EMAIL_VERIFICATION_LINK_EXPIRES_IN", "24h"),
  emailVerificationOtpExpiresIn: optionalEnv("EMAIL_VERIFICATION_OTP_EXPIRES_IN", "10m"),
  loginOtpExpiresIn: optionalEnv("LOGIN_OTP_EXPIRES_IN", optionalEnv("EMAIL_VERIFICATION_OTP_EXPIRES_IN", "10m")),
  // Dev/E2E only. Never return OTP in API responses when NODE_ENV=production,
  // even if LOGIN_OTP_RETURN_IN_RESPONSE is accidentally set to true.
  loginOtpReturnInResponse:
    !env.isProduction &&
    optionalEnv("LOGIN_OTP_RETURN_IN_RESPONSE", "false").toLowerCase() === "true",
  verificationResendCooldownSeconds: parsePositiveInt(
    optionalEnv("VERIFICATION_RESEND_COOLDOWN_SECONDS", "60"),
    "VERIFICATION_RESEND_COOLDOWN_SECONDS",
  ),
  verificationOtpMaxAttempts: parsePositiveInt(
    optionalEnv("VERIFICATION_OTP_MAX_ATTEMPTS", "5"),
    "VERIFICATION_OTP_MAX_ATTEMPTS",
  ),
  bcryptSaltRounds: parsePositiveInt(optionalEnv("BCRYPT_SALT_ROUNDS", "12"), "BCRYPT_SALT_ROUNDS"),
  refreshCookieName: optionalEnv("REFRESH_COOKIE_NAME", "salon_refresh_token"),
  refreshCookieSecure: process.env.REFRESH_COOKIE_SECURE !== undefined
    ? parseBoolean(process.env.REFRESH_COOKIE_SECURE, "REFRESH_COOKIE_SECURE")
    : env.isProduction,
  refreshCookieSameSite: parseSameSite(optionalEnv("REFRESH_COOKIE_SAME_SITE", "strict")),
} as const;

export type AuthConfig = typeof authConfig;
