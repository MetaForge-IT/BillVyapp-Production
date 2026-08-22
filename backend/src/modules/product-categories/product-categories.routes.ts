import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { productCategoriesController } from "./product-categories.controller";
import {
  createProductCategorySchema,
  updateProductCategorySchema,
} from "./product-categories.validators";

const productCategoriesRouter = Router();

productCategoriesRouter.use(authenticate);

productCategoriesRouter.get("/", productCategoriesController.list);
productCategoriesRouter.get("/:categoryId", productCategoriesController.getById);
productCategoriesRouter.post(
  "/",
  validateRequest(createProductCategorySchema),
  productCategoriesController.create,
);
productCategoriesRouter.patch(
  "/:categoryId",
  validateRequest(updateProductCategorySchema),
  productCategoriesController.update,
);
productCategoriesRouter.delete("/:categoryId", productCategoriesController.delete);

export { productCategoriesRouter };
