import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

function readMetricsToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }

  const direct = req.headers["x-metrics-token"];
  if (typeof direct === "string") {
    return direct.trim();
  }

  return undefined;
}

/**
 * When METRICS_TOKEN is set, require Bearer or X-Metrics-Token on /api/metrics.
 * Open in dev/test when unset; in production without a token, deny access.
 */
export function metricsAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.METRICS_TOKEN?.trim();

  if (!expected) {
    if (env.isProduction) {
      res.status(403).send("Metrics endpoint disabled — set METRICS_TOKEN");
      return;
    }
    next();
    return;
  }

  const provided = readMetricsToken(req);
  if (provided !== expected) {
    res.status(401).send("Unauthorized");
    return;
  }

  next();
}
