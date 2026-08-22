import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env";
import { rateLimitConfig } from "../config/database.config";
import { getRedis } from "../config/redis";

function createStore(prefix: string) {
  const redis = getRedis();
  if (!redis) return undefined;

  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (command: string, ...args: string[]) =>
      redis.call(command, ...args) as Promise<number>,
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
