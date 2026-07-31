import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate, authorize } from "../auth/auth.middleware";
import { myFranchiseController } from "./my-franchise.controller";
import { createManagerSchema, createShopSchema, updateShopAddressSchema } from "./my-franchise.validators";

const myFranchiseRouter = Router();

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

myFranchiseRouter.use(authenticate, authorize("admin"));

myFranchiseRouter.get("/", myFranchiseController.get);
myFranchiseRouter.post(
  "/managers",
  validateRequest(createManagerSchema),
  myFranchiseController.createManager,
);
myFranchiseRouter.post(
  "/shops",
  validateRequest(createShopSchema),
  myFranchiseController.createShop,
);
myFranchiseRouter.patch(
  "/shops/:shopId",
  validateRequest(updateShopAddressSchema),
  myFranchiseController.updateShop,
);

export { myFranchiseRouter };
