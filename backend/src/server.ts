import "./bootstrap-timezone";
import { createApp } from "./app";
import { connectRedis, disconnectPrisma, disconnectRedis, env } from "./config";
import { initSentry, Sentry } from "./config/sentry";
import { startBackgroundWorkers, stopBackgroundWorkers } from "./queues";
import { logger } from "./utils/logger";

initSentry();

const app = createApp();

void connectRedis().then((connected) => {
  if (connected) {
    logger.info("Redis cache connected");
    startBackgroundWorkers();
  } else {
    logger.warn("Redis unavailable — WhatsApp sends will run inline (no BullMQ)");
  }
});

const server = app.listen(env.port, "0.0.0.0", () => {
  logger.info(`${env.appName} listening on port ${env.port}`, {
    nodeEnv: env.nodeEnv,
    apiPrefix: env.apiPrefix,
  });
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully`);

  server.close(async () => {
    await stopBackgroundWorkers();
    await disconnectPrisma();
    await disconnectRedis();
    await Sentry.close(2000);
    logger.info("Server stopped");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
  void shutdown("uncaughtException");
});
