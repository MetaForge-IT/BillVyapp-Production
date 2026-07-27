import type { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application } from "express";
import path from "node:path";
import helmet from "helmet";
import { env } from "./config";
import { s3Config } from "./config/s3.config";
import { metricsMiddleware } from "./middleware/metrics";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFound";
import { requestLogger } from "./middleware/requestLogger";
import { apiRouter } from "./routes";

export function createApp(): Application {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());

  const devCorsOrigin: CorsOptions["origin"] = (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    const allowed =
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(
        origin,
      );
    callback(null, allowed);
  };

  const configuredOrigins = env.corsOrigin
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const prodCorsOrigin: CorsOptions["origin"] = (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, configuredOrigins.includes(origin));
  };

  app.use(
    cors({
      origin: env.isDevelopment ? devCorsOrigin : prodCorsOrigin,
      credentials: true,
    }),
  );

  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  app.use(requestLogger);
  app.use(metricsMiddleware);

  if (!s3Config.enabled) {
    app.use(
      "/uploads",
      express.static(path.resolve(process.cwd(), s3Config.localUploadDir)),
    );
  }

  app.use(env.apiPrefix, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
