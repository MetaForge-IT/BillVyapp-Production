import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { couponsController } from "./coupons.controller";
import { createCouponSchema, updateCouponSchema } from "./coupons.validators";

const couponsRouter = Router();

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

couponsRouter.use(authenticate);

couponsRouter.get("/", couponsController.list);
couponsRouter.get("/:couponId", couponsController.getById);
couponsRouter.post("/", validateRequest(createCouponSchema), couponsController.create);
couponsRouter.patch("/:couponId", validateRequest(updateCouponSchema), couponsController.update);
couponsRouter.delete("/:couponId", couponsController.delete);

export { couponsRouter };
