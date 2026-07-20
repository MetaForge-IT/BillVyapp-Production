import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { serviceProductLinksController } from "./service-product-links.controller";
import { replaceServiceProductLinksSchema } from "./service-product-links.validators";

const serviceProductLinksRouter = Router();

function validateRequest(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: issue.path.length > 0 ? issue.path.join(".") : "body",
          message: issue.message,
        }));
        next(new BadRequestError("Validation failed", errors));
        return;
      }
      next(error);
    }
  };
}

serviceProductLinksRouter.use(authenticate);

serviceProductLinksRouter.get("/", serviceProductLinksController.list);
serviceProductLinksRouter.put(
  "/:serviceId",
  validateRequest(replaceServiceProductLinksSchema),
  serviceProductLinksController.replace,
);

export { serviceProductLinksRouter };
