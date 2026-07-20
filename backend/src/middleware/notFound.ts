import type { Request, Response } from "express";
import { sendError } from "../utils/apiResponse";

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, {
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
  });
}
