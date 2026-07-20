import { optionalEnv } from "./parse-env";

export const redisConfig = {
  url: process.env.REDIS_URL ?? "",
  enabled: Boolean(process.env.REDIS_URL),
  dashboardTtlSeconds: Number(optionalEnv("REDIS_DASHBOARD_TTL_SECONDS", "60")),
  defaultTtlSeconds: Number(optionalEnv("REDIS_DEFAULT_TTL_SECONDS", "300")),
} as const;
