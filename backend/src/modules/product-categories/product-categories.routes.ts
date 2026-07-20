import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { productCategoriesController } from "./product-categories.controller";
import {
  createProductCategorySchema,
  updateProductCategorySchema,
} from "./product-categories.validators";

const productCategoriesRouter = Router();

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
