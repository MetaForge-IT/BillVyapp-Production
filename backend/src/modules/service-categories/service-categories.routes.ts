import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { serviceCategoriesController } from "./service-categories.controller";
import {
  createServiceCategorySchema,
  updateServiceCategorySchema,
} from "./service-categories.validators";

const serviceCategoriesRouter = Router();

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
