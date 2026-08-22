import dotenv from "dotenv";

dotenv.config();

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

const nodeEnv = optionalEnv("NODE_ENV", "development");

export const env = {
  nodeEnv,
  isDevelopment: nodeEnv === "development",
  isProduction: nodeEnv === "production",
  isTest: nodeEnv === "test",

  appName: optionalEnv("APP_NAME", "BillVyapp API"),
  port: Number(optionalEnv("PORT", "3000")),
  apiPrefix: optionalEnv("API_PREFIX", "/api"),

  databaseUrl: requireEnv("DATABASE_URL"),
  databaseReadUrl: optionalEnv("DATABASE_URL_READ", ""),
  corsOrigin: optionalEnv("CORS_ORIGIN", "http://localhost:5173"),

  logLevel: optionalEnv("LOG_LEVEL", nodeEnv === "development" ? "debug" : "info"),

  frontendUrl: optionalEnv("FRONTEND_URL", "http://localhost:5173"),
  apiPublicUrl: optionalEnv("API_PUBLIC_URL", "http://localhost:3000"),
  companyName: optionalEnv("COMPANY_NAME", "BillVyapp"),
  supportEmail: optionalEnv("SUPPORT_EMAIL", "support@billvyapp.com"),
} as const;

export type Env = typeof env;
