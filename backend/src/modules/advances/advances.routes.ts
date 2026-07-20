import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { advancesController } from "./advances.controller";
import {
  createAdvanceSchema,
  deductAdvanceSchema,
  updateAdvanceSchema,
} from "./advances.validators";

const advancesRouter = Router();

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

advancesRouter.use(authenticate);

advancesRouter.get("/", advancesController.list);
advancesRouter.get("/:advanceId", advancesController.getById);
advancesRouter.post("/", validateRequest(createAdvanceSchema), advancesController.create);
advancesRouter.patch("/:advanceId", validateRequest(updateAdvanceSchema), advancesController.update);
advancesRouter.patch(
  "/:advanceId/deduct",
  validateRequest(deductAdvanceSchema),
  advancesController.deduct,
);
advancesRouter.delete("/:advanceId", advancesController.delete);

export { advancesRouter };
