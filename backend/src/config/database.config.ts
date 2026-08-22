import { optionalEnv } from "./parse-env";

/** Optional read-replica URL for reporting/dashboard/search (falls back to primary). */
export const databaseConfig = {
  readUrl: process.env.DATABASE_URL_READ?.trim() || "",
  readReplicaEnabled: Boolean(process.env.DATABASE_URL_READ?.trim()),
} as const;

export const rateLimitConfig = {
  enabled: optionalEnv("RATE_LIMIT_ENABLED", "true") !== "false",
  windowMs: Number(optionalEnv("RATE_LIMIT_WINDOW_MS", "60000")),
  authMax: Number(optionalEnv("RATE_LIMIT_AUTH_MAX", "10")),
} as const;
