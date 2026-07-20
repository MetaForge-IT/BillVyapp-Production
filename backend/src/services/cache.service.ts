import { getRedis } from "../config/redis";
import { redisConfig } from "../config/redis.config";
import { logger } from "../utils/logger";

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    logger.warn("Redis cache read failed", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = redisConfig.defaultTtlSeconds,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    logger.warn("Redis cache write failed", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    logger.warn("Redis cache delete failed", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function cacheDeleteByPrefix(prefix: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
    const keys: string[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (batch: string[]) => {
        keys.push(...batch);
      });
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    logger.warn("Redis cache prefix delete failed", {
      prefix,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
