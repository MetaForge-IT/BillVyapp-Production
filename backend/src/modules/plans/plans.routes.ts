import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { plansController } from "./plans.controller";
import { createPlanSchema, enrollCustomerSchema, updatePlanSchema } from "./plans.validators";

const plansRouter = Router();

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

plansRouter.use(authenticate);

plansRouter.get("/services", plansController.listServices);
plansRouter.get("/customers", plansController.listCustomers);
plansRouter.get("/", plansController.listPlans);
plansRouter.post("/", validateRequest(createPlanSchema), plansController.createPlan);
plansRouter.patch("/:planId", validateRequest(updatePlanSchema), plansController.updatePlan);
plansRouter.get("/enrollments", plansController.listEnrollments);
plansRouter.post("/enrollments", validateRequest(enrollCustomerSchema), plansController.enrollCustomer);

export { plansRouter };
