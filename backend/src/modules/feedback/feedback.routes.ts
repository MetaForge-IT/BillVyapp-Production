import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate, requireManager } from "../auth/auth.middleware";
import { feedbackController } from "./feedback.controller";
import { createFeedbackSchema, updateFeedbackSchema } from "./feedback.validators";

const feedbackRouter = Router();

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
