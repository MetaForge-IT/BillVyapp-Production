import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../utils/errors";

type RequestTarget = "body" | "query" | "params";

function formatZodErrors(error: ZodError, target: RequestTarget) {
  const fallbackField = target === "body" ? "body" : target;
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : fallbackField,
    message: issue.message,
  }));
}

/**
 * Validates req.body, req.query, or req.params against a Zod schema.
 */
export function validateRequest(schema: ZodType, target: RequestTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);
      if (target === "body") {
        req.body = parsed;
      } else if (target === "query") {
        Object.assign(req.query, parsed);
      } else {
        Object.assign(req.params, parsed);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new BadRequestError("Validation failed", formatZodErrors(error, target)));
        return;
      }
      next(error);
    }
  };
}
