import type { ApiValidationError } from "../types";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errors?: ApiValidationError[];
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    options?: {
      code?: string;
      errors?: ApiValidationError[];
      isOperational?: boolean;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = options?.code ?? "APP_ERROR";
    this.errors = options?.errors;
    this.isOperational = options?.isOperational ?? true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", errors?: ApiValidationError[]) {
    super(400, message, { code: "BAD_REQUEST", errors });
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, { code: "UNAUTHORIZED" });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message, { code: "FORBIDDEN" });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message, { code: "NOT_FOUND" });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, message, { code: "CONFLICT" });
    this.name = "ConflictError";
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal server error", cause?: unknown) {
    super(500, message, { code: "INTERNAL_SERVER_ERROR", isOperational: false, cause });
    this.name = "InternalServerError";
  }
}
