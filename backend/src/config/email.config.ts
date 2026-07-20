import { env } from "./env";

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

export const emailConfig = {
  smtpHost: optionalEnv("SMTP_HOST", ""),
  smtpPort: parsePositiveInt(optionalEnv("SMTP_PORT", "587"), "SMTP_PORT"),
  smtpUser: optionalEnv("SMTP_USER", ""),
  smtpPass: optionalEnv("SMTP_PASS", ""),
  smtpSecure: process.env.SMTP_SECURE !== undefined
    ? parseBoolean(process.env.SMTP_SECURE, "SMTP_SECURE")
    : false,
  fromEmail: optionalEnv("SMTP_FROM_EMAIL", optionalEnv("SMTP_USER", "noreply@billvyapp.com")),
  fromName: optionalEnv("SMTP_FROM_NAME", env.companyName),
  supportEmail: env.supportEmail,
  companyName: env.companyName,
  frontendUrl: env.frontendUrl,
  apiPublicUrl: env.apiPublicUrl,
  isConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
} as const;

export type EmailConfig = typeof emailConfig;
