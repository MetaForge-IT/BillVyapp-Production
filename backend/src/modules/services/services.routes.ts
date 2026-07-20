import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { servicesController } from "./services.controller";
import { createServiceSchema, updateServiceSchema } from "./services.validators";

const servicesRouter = Router();

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

servicesRouter.use(authenticate);

servicesRouter.get("/catalog", servicesController.listCatalog);
servicesRouter.get("/", servicesController.list);
servicesRouter.get("/:serviceId", servicesController.getById);
servicesRouter.post("/", validateRequest(createServiceSchema), servicesController.create);
servicesRouter.patch("/:serviceId", validateRequest(updateServiceSchema), servicesController.update);
servicesRouter.delete("/:serviceId", servicesController.delete);

export { servicesRouter };
