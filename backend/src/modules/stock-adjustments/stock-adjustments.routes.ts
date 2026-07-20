import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { stockAdjustmentsController } from "./stock-adjustments.controller";
import {
  createStockAdjustmentSchema,
  updateStockAdjustmentSchema,
} from "./stock-adjustments.validators";

const stockAdjustmentsRouter = Router();

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

stockAdjustmentsRouter.use(authenticate);

stockAdjustmentsRouter.get("/", stockAdjustmentsController.list);
stockAdjustmentsRouter.get("/:adjustmentId", stockAdjustmentsController.getById);
stockAdjustmentsRouter.post(
  "/",
  validateRequest(createStockAdjustmentSchema),
  stockAdjustmentsController.create,
);
stockAdjustmentsRouter.patch(
  "/:adjustmentId",
  validateRequest(updateStockAdjustmentSchema),
  stockAdjustmentsController.update,
);
stockAdjustmentsRouter.delete("/:adjustmentId", stockAdjustmentsController.delete);

export { stockAdjustmentsRouter };
