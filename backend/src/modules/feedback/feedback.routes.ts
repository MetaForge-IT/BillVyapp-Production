import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate, requireManager } from "../auth/auth.middleware";
import { feedbackController } from "./feedback.controller";
import { createFeedbackSchema, updateFeedbackSchema } from "./feedback.validators";

const feedbackRouter = Router();

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

feedbackRouter.use(authenticate);

feedbackRouter.get("/stats", feedbackController.stats);
feedbackRouter.get("/", feedbackController.list);
feedbackRouter.get("/:feedbackId", feedbackController.getById);
feedbackRouter.post("/", validateRequest(createFeedbackSchema), feedbackController.create);
feedbackRouter.patch(
  "/:feedbackId",
  requireManager,
  validateRequest(updateFeedbackSchema),
  feedbackController.update,
);
feedbackRouter.delete("/:feedbackId", requireManager, feedbackController.delete);

export { feedbackRouter };
