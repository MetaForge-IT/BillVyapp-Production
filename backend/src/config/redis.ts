import Redis from "ioredis";
import { redisConfig } from "./redis.config";
import { logger } from "../utils/logger";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!redisConfig.enabled) {
    return null;
  }

  if (!client) {
    client = new Redis(redisConfig.url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    client.on("error", (error) => {
      logger.warn("Redis connection error", { message: error.message });
    });
  }

  return client;
}

export async function connectRedis(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    await redis.ping();
    return true;
  } catch (error) {
    logger.warn("Redis unavailable — continuing without cache", {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!client) return;
  await client.quit();
  client = null;
}

export async function pingRedis(): Promise<"up" | "down" | "disabled"> {
  if (!redisConfig.enabled) return "disabled";
  const redis = getRedis();
  if (!redis) return "down";

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    const result = await redis.ping();
    return result === "PONG" ? "up" : "down";
  } catch {
    return "down";
  }
}
