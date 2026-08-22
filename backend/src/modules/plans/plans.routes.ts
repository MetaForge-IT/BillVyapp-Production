import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { plansController } from "./plans.controller";
import { createPlanSchema, enrollCustomerSchema, updatePlanSchema } from "./plans.validators";

const plansRouter = Router();

plansRouter.use(authenticate);

plansRouter.get("/services", plansController.listServices);
plansRouter.get("/customers", plansController.listCustomers);
plansRouter.get("/", plansController.listPlans);
plansRouter.post("/", validateRequest(createPlanSchema), plansController.createPlan);
plansRouter.patch("/:planId", validateRequest(updatePlanSchema), plansController.updatePlan);
plansRouter.get("/enrollments", plansController.listEnrollments);
plansRouter.post("/enrollments", validateRequest(enrollCustomerSchema), plansController.enrollCustomer);

export { plansRouter };
