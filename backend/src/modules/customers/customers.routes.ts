import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { customersController } from "./customers.controller";
import {
  createCustomerSchema,
  redeemLoyaltySchema,
  updateCustomerSchema,
} from "./customers.validators";

const customersRouter = Router();

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

customersRouter.use(authenticate);

customersRouter.get("/", customersController.list);
customersRouter.get("/:customerId/visits", customersController.getVisits);
customersRouter.get("/:customerId/loyalty", customersController.getLoyalty);
customersRouter.post(
  "/:customerId/loyalty/redeem",
  validateRequest(redeemLoyaltySchema),
  customersController.redeemLoyalty,
);
customersRouter.get("/:customerId", customersController.getById);
customersRouter.post("/", validateRequest(createCustomerSchema), customersController.create);
customersRouter.patch("/:customerId", validateRequest(updateCustomerSchema), customersController.update);
customersRouter.delete("/:customerId", customersController.delete);

export { customersRouter };
