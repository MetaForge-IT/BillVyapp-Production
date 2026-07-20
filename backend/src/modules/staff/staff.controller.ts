import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { staffService } from "./staff.service";

export class StaffController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const staff = await staffService.listActive(auth);
    sendSuccess(res, { message: "Staff retrieved", data: staff });
  });
}

export const staffController = new StaffController();
