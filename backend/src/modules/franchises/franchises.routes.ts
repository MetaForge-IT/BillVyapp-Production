import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate, authorize } from "../auth/auth.middleware";
import { franchisesController } from "./franchises.controller";
import {
  createFranchiseSchema,
  createShopSchema,
  createStaffUserSchema,
  updateFranchiseSchema,
} from "./franchises.validators";

const franchisesRouter = Router();

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
