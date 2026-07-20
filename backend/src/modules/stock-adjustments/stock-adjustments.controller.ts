import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { stockAdjustmentsService } from "./stock-adjustments.service";
import type { CreateStockAdjustmentInput, UpdateStockAdjustmentInput } from "./stock-adjustments.validators";

export class StockAdjustmentsController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const { productId } = req.query;
    const adjustments = await stockAdjustmentsService.list(
      auth,
      typeof productId === "string" ? productId : undefined,
    );
    sendSuccess(res, { message: "Stock adjustments retrieved", data: adjustments });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const adjustment = await stockAdjustmentsService.getById(auth, String(req.params.adjustmentId));
    sendSuccess(res, { message: "Stock adjustment retrieved", data: adjustment });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateStockAdjustmentInput;
    const adjustment = await stockAdjustmentsService.create(auth, body);
    sendCreated(res, { message: "Stock adjustment recorded", data: adjustment });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateStockAdjustmentInput;
    const adjustment = await stockAdjustmentsService.update(
      auth,
      String(req.params.adjustmentId),
      body,
    );
    sendSuccess(res, { message: "Stock adjustment updated", data: adjustment });
  });

  delete = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await stockAdjustmentsService.delete(auth, String(req.params.adjustmentId));
  });
}

export const stockAdjustmentsController = new StockAdjustmentsController();
