import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { advancesService } from "./advances.service";
import type { CreateAdvanceInput, DeductAdvanceInput, UpdateAdvanceInput } from "./advances.validators";

export class AdvancesController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const advances = await advancesService.list(auth);
    sendSuccess(res, { message: "Advances retrieved", data: advances });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const advance = await advancesService.getById(auth, String(req.params.advanceId));
    sendSuccess(res, { message: "Advance retrieved", data: advance });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateAdvanceInput;
    const advance = await advancesService.create(auth, body);
    sendCreated(res, { message: "Advance created", data: advance });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateAdvanceInput;
    const advance = await advancesService.update(auth, String(req.params.advanceId), body);
    sendSuccess(res, { message: "Advance updated", data: advance });
  });

  deduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as DeductAdvanceInput;
    const advance = await advancesService.deduct(auth, String(req.params.advanceId), body);
    sendSuccess(res, { message: "Advance deducted", data: advance });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await advancesService.delete(auth, String(req.params.advanceId));
    sendNoContent(res);
  });
}

export const advancesController = new AdvancesController();
