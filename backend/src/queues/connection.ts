import { Redis } from "ioredis";
import { redisConfig } from "../config/redis.config";
import { logger } from "../utils/logger";

/**
 * Dedicated Redis connections for BullMQ.
 * Workers require maxRetriesPerRequest: null.
 */
let sharedConnection: Redis | null = null;

export function isBullMqEnabled(): boolean {
  return Boolean(redisConfig.enabled && redisConfig.url);
}

export function createBullMqConnection(): Redis {
  if (!redisConfig.url) {
    throw new Error("REDIS_URL is required for BullMQ");
  }

  return new Redis(redisConfig.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
}

export function getBullMqConnection(): Redis | null {
  if (!isBullMqEnabled()) {
    return null;
  }

  if (!sharedConnection) {
    sharedConnection = createBullMqConnection();
    sharedConnection.on("error", (error) => {
      logger.warn("BullMQ Redis error", { message: error.message });
    });
  }

  return sharedConnection;
}

export async function closeBullMqConnection(): Promise<void> {
  if (!sharedConnection) return;
  await sharedConnection.quit();
  sharedConnection = null;
}
