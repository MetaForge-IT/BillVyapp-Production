import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { inventoryStatsService } from "./inventory-stats.service";

export class InventoryStatsController {
  getStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const stats = await inventoryStatsService.getStats(auth);
    sendSuccess(res, { message: "Inventory statistics retrieved", data: stats });
  });
}

export const inventoryStatsController = new InventoryStatsController();
