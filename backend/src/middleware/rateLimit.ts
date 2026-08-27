import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env";
import { rateLimitConfig } from "../config/database.config";
import { getRedis } from "../config/redis";
import { logger } from "../utils/logger";

/**
 * Prefer Redis when configured. If Redis is down, express-rate-limit
 * must not turn /auth/login into HTTP 500 (passOnStoreError below).
 */
function createStore(prefix: string) {
  const redis = getRedis();
  if (!redis) return undefined;

  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: async (command: string, ...args: string[]) => {
      try {
        if (redis.status !== "ready") {
          await redis.connect();
        }
        return (await redis.call(command, ...args)) as number;
      } catch (error) {
        logger.warn("Rate-limit Redis command failed — allowing request", {
          prefix,
          command,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  });
}

function buildLimiter(options: {
  windowMs: number;
  max: number;
  prefix: string;
  message: string;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(options.prefix),
    // Critical on EC2: Redis down must not break login with 500.
    passOnStoreError: true,
    message: {
      success: false,
      message: options.message,
    },
  });
}

const noopLimiter = ((_req, _res, next) => {
  next();
}) as RateLimitRequestHandler;

/** Skip rate limits in test and when explicitly disabled. */
function limitersEnabled(): boolean {
  return rateLimitConfig.enabled && !env.isTest;
}

/** Login / OTP — stricter per IP; applied only on auth login routes. */
export const authRateLimiter: RateLimitRequestHandler = limitersEnabled()
  ? buildLimiter({
      windowMs: rateLimitConfig.windowMs,
      max: rateLimitConfig.authMax,
      prefix: "auth-login",
      message: "Too many authentication attempts — please wait before retrying",
    })
  : noopLimiter;
