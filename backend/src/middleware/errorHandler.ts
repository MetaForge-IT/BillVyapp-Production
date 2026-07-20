import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config";
import { sendError } from "../utils/apiResponse";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  switch (err.code) {
    case "P2002":
      return new AppError(409, "A record with this value already exists", {
        code: "DUPLICATE_RECORD",
      });
    case "P2025":
      return new AppError(404, "Record not found", { code: "RECORD_NOT_FOUND" });
    case "P2003":
      return new AppError(400, "Related record not found", { code: "FOREIGN_KEY_VIOLATION" });
    default:
      return new AppError(500, "Database operation failed", {
        code: "DATABASE_ERROR",
        isOperational: false,
        cause: err,
      });
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    appError = mapPrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    appError = new AppError(400, "Invalid database query", {
      code: "DATABASE_VALIDATION_ERROR",
    });
  } else if (err instanceof SyntaxError && "body" in err) {
    appError = new AppError(400, "Invalid JSON payload", { code: "INVALID_JSON" });
  } else {
    appError = new AppError(500, "Internal server error", {
      code: "INTERNAL_SERVER_ERROR",
      isOperational: false,
      cause: err,
    });
  }

  if (appError.statusCode >= 500) {
    logger.error("Unhandled server error", err, {
      method: req.method,
      path: req.originalUrl,
      code: appError.code,
    });
    if (err instanceof Error) {
      void import("../config/sentry").then(({ Sentry }) => Sentry.captureException(err));
    }
  } else {
    logger.warn("Request failed", {
      method: req.method,
      path: req.originalUrl,
      statusCode: appError.statusCode,
      code: appError.code,
      message: appError.message,
    });
  }

  sendError(res, {
    statusCode: appError.statusCode,
    message: appError.isOperational
      ? appError.message
      : env.isDevelopment && err instanceof Error
        ? err.message
        : "Internal server error",
    code: appError.code,
    errors: appError.errors,
    stack: env.isDevelopment && err instanceof Error ? err.stack : undefined,
  });
}
