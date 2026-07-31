import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { myFranchiseService } from "./my-franchise.service";
import type { CreateManagerInput, CreateShopInput, UpdateShopAddressInput } from "./my-franchise.validators";

export class MyFranchiseController {
  get = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const data = await myFranchiseService.getMyFranchise(auth);
    res.json({ success: true, message: "Franchise", data });
  });

  createManager = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const data = await myFranchiseService.createManager(auth, req.body as CreateManagerInput);
    res.status(201).json({ success: true, message: "Manager created", data });
  });

  createShop = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const data = await myFranchiseService.createShop(auth, req.body as CreateShopInput);
    res.status(201).json({ success: true, message: "Shop created", data });
  });

  updateShop = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const data = await myFranchiseService.updateShopAddress(
      auth,
      String(req.params.shopId),
      req.body as UpdateShopAddressInput,
    );
    res.json({ success: true, message: "Shop address updated", data });
  });
}

export const myFranchiseController = new MyFranchiseController();
