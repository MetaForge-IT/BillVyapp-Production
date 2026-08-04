import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate, authorize } from "../auth/auth.middleware";
import { franchisesController } from "./franchises.controller";
import {
  createFranchiseSchema,
  createShopSchema,
  createStaffUserSchema,
  updateFranchiseSchema,
} from "./franchises.validators";

const franchisesRouter = Router();

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

franchisesRouter.use(authenticate, authorize("super_admin"));

franchisesRouter.get("/overview", franchisesController.overview);
franchisesRouter.get("/revenue", franchisesController.revenue);
franchisesRouter.get("/staff", franchisesController.listStaff);
franchisesRouter.post(
  "/staff",
  validateRequest(createStaffUserSchema),
  franchisesController.createStaff,
);
franchisesRouter.get("/", franchisesController.list);
franchisesRouter.post("/", validateRequest(createFranchiseSchema), franchisesController.create);
franchisesRouter.get("/:id", franchisesController.get);
franchisesRouter.patch("/:id", validateRequest(updateFranchiseSchema), franchisesController.update);
franchisesRouter.post(
  "/:id/shops",
  validateRequest(createShopSchema),
  franchisesController.createShop,
);

export { franchisesRouter };
