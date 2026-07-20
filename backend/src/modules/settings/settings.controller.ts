import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { settingsService } from "./settings.service";
import type { UpdateSettingsInput } from "./settings.validators";

export class SettingsController {
  get = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const settings = await settingsService.get(auth);
    sendSuccess(res, { message: "Settings retrieved", data: settings });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateSettingsInput;
    const settings = await settingsService.update(auth, body);
    sendSuccess(res, { message: "Settings updated", data: settings });
  });
}

export const settingsController = new SettingsController();
