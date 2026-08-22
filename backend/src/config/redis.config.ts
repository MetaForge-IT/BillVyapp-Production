import { optionalEnv } from "./parse-env";

export const redisConfig = {
  url: process.env.REDIS_URL ?? "",
  enabled: Boolean(process.env.REDIS_URL),
  dashboardTtlSeconds: Number(optionalEnv("REDIS_DASHBOARD_TTL_SECONDS", "60")),
  defaultTtlSeconds: Number(optionalEnv("REDIS_DEFAULT_TTL_SECONDS", "300")),
  authUserTtlSeconds: Number(optionalEnv("REDIS_AUTH_USER_TTL_SECONDS", "120")),
  /** When true, recompute dashboard in Redis after salon data writes. */
  dashboardPrecompute: optionalEnv("DASHBOARD_PRECOMPUTE", "true") !== "false",
  dashboardSnapshotTtlSeconds: Number(
    optionalEnv("REDIS_DASHBOARD_SNAPSHOT_TTL_SECONDS", optionalEnv("REDIS_DASHBOARD_TTL_SECONDS", "60")),
  ),
} as const;
