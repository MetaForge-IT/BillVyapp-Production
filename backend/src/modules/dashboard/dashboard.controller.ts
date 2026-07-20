import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { dashboardService } from "./dashboard.service";

export class DashboardController {
  getDashboard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const data = await dashboardService.getDashboard(auth);
    sendSuccess(res, { message: "Dashboard data retrieved", data });
  });
}

export const dashboardController = new DashboardController();
