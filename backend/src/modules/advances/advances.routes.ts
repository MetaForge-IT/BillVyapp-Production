import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { advancesController } from "./advances.controller";
import {
  createAdvanceSchema,
  deductAdvanceSchema,
  updateAdvanceSchema,
} from "./advances.validators";

const advancesRouter = Router();

advancesRouter.use(authenticate);

advancesRouter.get("/", advancesController.list);
advancesRouter.get("/:advanceId", advancesController.getById);
advancesRouter.post("/", validateRequest(createAdvanceSchema), advancesController.create);
advancesRouter.patch("/:advanceId", validateRequest(updateAdvanceSchema), advancesController.update);
advancesRouter.patch(
  "/:advanceId/deduct",
  validateRequest(deductAdvanceSchema),
  advancesController.deduct,
);
advancesRouter.delete("/:advanceId", advancesController.delete);

export { advancesRouter };
