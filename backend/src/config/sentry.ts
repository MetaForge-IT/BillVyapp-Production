import * as Sentry from "@sentry/node";
import { sentryConfig } from "../config/sentry.config";
import { env } from "../config/env";

export function initSentry(): void {
  if (!sentryConfig.enabled) return;

  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    tracesSampleRate: sentryConfig.tracesSampleRate,
    enabled: !env.isTest,
  });
}

export { Sentry };
