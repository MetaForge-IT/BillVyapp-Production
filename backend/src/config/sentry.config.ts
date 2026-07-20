import { optionalEnv } from "./parse-env";

export const sentryConfig = {
  dsn: process.env.SENTRY_DSN ?? "",
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: optionalEnv("SENTRY_ENVIRONMENT", process.env.NODE_ENV ?? "development"),
  tracesSampleRate: Number(optionalEnv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
} as const;
