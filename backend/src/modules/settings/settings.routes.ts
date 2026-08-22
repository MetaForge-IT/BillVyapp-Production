import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate, requireManager } from "../auth/auth.middleware";
import { settingsController } from "./settings.controller";
import { updateSettingsSchema } from "./settings.validators";

const settingsRouter = Router();

settingsRouter.use(authenticate);

settingsRouter.get("/", settingsController.get);
settingsRouter.patch("/", requireManager, validateRequest(updateSettingsSchema), settingsController.update);

export { settingsRouter };
