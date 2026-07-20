import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { redisConfig } from "../config/redis.config";
import { pingRedis } from "../config/redis";
import { s3Config } from "../config/s3.config";
import { checkS3Connection } from "../services/storage.service";
import type { HealthResponse } from "../types";

export interface ExtendedHealthResponse extends HealthResponse {
  checks: {
    database: "up" | "down";
    redis: "up" | "down" | "disabled";
    storage: "up" | "down" | "disabled" | "local";
  };
  version: string;
}

export async function getHealthStatus(): Promise<ExtendedHealthResponse> {
  let database: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }

  const redis = await pingRedis();
  let storage: ExtendedHealthResponse["checks"]["storage"] = "local";
  if (s3Config.enabled) {
    storage = await checkS3Connection();
  } else if (!redisConfig.enabled) {
    storage = "local";
  }

  const healthy = database === "up";

  return {
    status: healthy ? "OK" : "DEGRADED",
    message: healthy ? "BillVyapp Backend Running" : "Database unreachable",
    checks: {
      database,
      redis,
      storage,
    },
    version: process.env.npm_package_version ?? "1.0.0",
  };
}

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const payload = await getHealthStatus();
  res.status(payload.status === "OK" ? 200 : 503).json(payload);
}
