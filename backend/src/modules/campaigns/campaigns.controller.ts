import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { campaignsService } from "./campaigns.service";
import type { CreateCampaignInput, ListCampaignsQuery } from "./campaigns.validators";

export class CampaignsController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const query: ListCampaignsQuery = {
      salonId: typeof req.query.salonId === "string" ? req.query.salonId : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
    };
    const campaigns = await campaignsService.list(auth, query);
    sendSuccess(res, { message: "Campaigns retrieved", data: campaigns });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const salonId = typeof req.query.salonId === "string" ? req.query.salonId : undefined;
    const campaign = await campaignsService.getById(auth, String(req.params.campaignId), salonId);
    sendSuccess(res, { message: "Campaign retrieved", data: campaign });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateCampaignInput;
    const campaign = await campaignsService.create(auth, body);
    sendCreated(res, { message: "Campaign created", data: campaign });
  });

  send = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const salonId = typeof req.query.salonId === "string" ? req.query.salonId : undefined;
    const campaign = await campaignsService.send(auth, String(req.params.campaignId), salonId);
    sendSuccess(res, { message: "Campaign sent", data: campaign });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const salonId = typeof req.query.salonId === "string" ? req.query.salonId : undefined;
    await campaignsService.delete(auth, String(req.params.campaignId), salonId);
    sendNoContent(res);
  });
}

export const campaignsController = new CampaignsController();
