import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { franchisesService } from "./franchises.service";
import type {
  CreateFranchiseInput,
  CreateShopInput,
  CreateStaffUserInput,
  UpdateFranchiseInput,
} from "./franchises.validators";

export class FranchisesController {
  overview = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const data = await franchisesService.overview();
    res.json({ success: true, message: "Overview", data });
  });

  list = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const data = await franchisesService.listFranchises();
    res.json({ success: true, message: "Franchises", data });
  });

  get = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await franchisesService.getFranchise(req.params.id as string);
    res.json({ success: true, message: "Franchise", data });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await franchisesService.createFranchise(req.body as CreateFranchiseInput);
    res.status(201).json({ success: true, message: "Franchise created", data });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await franchisesService.updateFranchise(
      req.params.id as string,
      req.body as UpdateFranchiseInput,
    );
    res.json({ success: true, message: "Franchise updated", data });
  });

  createShop = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await franchisesService.createShop(
      req.params.id as string,
      req.body as CreateShopInput,
    );
    res.status(201).json({ success: true, message: "Shop created", data });
  });

  listStaff = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const data = await franchisesService.listStaff();
    res.json({ success: true, message: "Staff", data });
  });

  createStaff = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await franchisesService.createStaffUser(req.body as CreateStaffUserInput);
    res.status(201).json({ success: true, message: "User created", data });
  });
}

export const franchisesController = new FranchisesController();
