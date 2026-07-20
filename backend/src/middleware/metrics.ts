import type { NextFunction, Request, Response } from "express";
import client from "prom-client";

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({ register: metricsRegistry });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

export const httpRequestTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [metricsRegistry],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestTotal.inc(labels);
  });

  next();
}

export async function getMetricsPayload(): Promise<string> {
  return metricsRegistry.metrics();
}
