import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { serviceCategoriesController } from "./service-categories.controller";
import {
  createServiceCategorySchema,
  updateServiceCategorySchema,
} from "./service-categories.validators";

const serviceCategoriesRouter = Router();

serviceCategoriesRouter.use(authenticate);

serviceCategoriesRouter.get("/", serviceCategoriesController.list);
serviceCategoriesRouter.get("/:categoryId", serviceCategoriesController.getById);
serviceCategoriesRouter.post(
  "/",
  validateRequest(createServiceCategorySchema),
  serviceCategoriesController.create,
);
serviceCategoriesRouter.patch(
  "/:categoryId",
  validateRequest(updateServiceCategorySchema),
  serviceCategoriesController.update,
);
serviceCategoriesRouter.delete("/:categoryId", serviceCategoriesController.delete);

export { serviceCategoriesRouter };
