import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { stockPurchasesService } from "./stock-purchases.service";
import type { CreateStockPurchaseInput, UpdateStockPurchaseInput } from "./stock-purchases.validators";

export class StockPurchasesController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const purchases = await stockPurchasesService.list(auth);
    sendSuccess(res, { message: "Stock purchases retrieved", data: purchases });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const purchase = await stockPurchasesService.getById(auth, String(req.params.purchaseId));
    sendSuccess(res, { message: "Stock purchase retrieved", data: purchase });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateStockPurchaseInput;
    const purchase = await stockPurchasesService.create(auth, body);
    sendCreated(res, { message: "Stock purchase recorded", data: purchase });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateStockPurchaseInput;
    const purchase = await stockPurchasesService.update(auth, String(req.params.purchaseId), body);
    sendSuccess(res, { message: "Stock purchase updated", data: purchase });
  });

  delete = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await stockPurchasesService.delete(auth, String(req.params.purchaseId));
  });
}

export const stockPurchasesController = new StockPurchasesController();
