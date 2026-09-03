import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate, authorize } from "../auth/auth.middleware";
import { campaignsController } from "./campaigns.controller";
import { createCampaignSchema } from "./campaigns.validators";

const campaignsRouter = Router();

campaignsRouter.use(authenticate, authorize("admin"));

campaignsRouter.get("/", campaignsController.list);
campaignsRouter.get("/:campaignId", campaignsController.getById);
campaignsRouter.post("/", validateRequest(createCampaignSchema), campaignsController.create);
campaignsRouter.post("/:campaignId/send", campaignsController.send);
campaignsRouter.delete("/:campaignId", campaignsController.delete);

export { campaignsRouter };
