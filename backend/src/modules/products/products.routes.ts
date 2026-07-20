import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { productsController } from "./products.controller";
import { createProductSchema, updateProductSchema } from "./products.validators";

const productsRouter = Router();

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

productsRouter.use(authenticate);

productsRouter.get("/", productsController.list);
productsRouter.get("/:productId", productsController.getById);
productsRouter.post("/", validateRequest(createProductSchema), productsController.create);
productsRouter.patch("/:productId", validateRequest(updateProductSchema), productsController.update);
productsRouter.delete("/:productId", productsController.delete);

export { productsRouter };
