import type { Response } from "express";
import type {
  ApiErrorResponse,
  ApiResponseMeta,
  ApiSuccessResponse,
  ApiValidationError,
} from "../types";

interface SendSuccessOptions<T> {
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: Omit<ApiResponseMeta, "timestamp">;
}

interface SendErrorOptions {
  statusCode?: number;
  message: string;
  code?: string;
  errors?: ApiValidationError[];
  stack?: string;
}

function buildMeta(meta?: Omit<ApiResponseMeta, "timestamp">): ApiResponseMeta {
  return {
    timestamp: new Date().toISOString(),
    ...meta,
  };
}

export function sendSuccess<T>(
  res: Response,
  options: SendSuccessOptions<T> = {},
): Response<ApiSuccessResponse<T>> {
  const { statusCode = 200, message = "Success", data, meta } = options;

  const body: ApiSuccessResponse<T> = {
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
    ...(meta ? { meta: buildMeta(meta) } : {}),
  };

  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  options: SendErrorOptions,
): Response<ApiErrorResponse> {
  const { statusCode = 500, message, code, errors, stack } = options;

  const body: ApiErrorResponse = {
    success: false,
    message,
    ...(code ? { code } : {}),
    ...(errors?.length ? { errors } : {}),
    ...(stack ? { stack } : {}),
  };

  return res.status(statusCode).json(body);
}

export function sendCreated<T>(
  res: Response,
  options: Omit<SendSuccessOptions<T>, "statusCode"> = {},
): Response<ApiSuccessResponse<T>> {
  return sendSuccess(res, { ...options, statusCode: 201, message: options.message ?? "Created" });
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}
