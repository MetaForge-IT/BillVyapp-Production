import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { vendorsService } from "./vendors.service";
import type { CreateVendorInput, UpdateVendorInput } from "./vendors.validators";

export class VendorsController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const vendors = await vendorsService.list(auth);
    sendSuccess(res, { message: "Vendors retrieved", data: vendors });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const vendor = await vendorsService.getById(auth, String(req.params.vendorId));
    sendSuccess(res, { message: "Vendor retrieved", data: vendor });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateVendorInput;
    const vendor = await vendorsService.create(auth, body);
    sendCreated(res, { message: "Vendor created", data: vendor });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateVendorInput;
    const vendor = await vendorsService.update(auth, String(req.params.vendorId), body);
    sendSuccess(res, { message: "Vendor updated", data: vendor });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await vendorsService.delete(auth, String(req.params.vendorId));
    sendNoContent(res);
  });
}

export const vendorsController = new VendorsController();
