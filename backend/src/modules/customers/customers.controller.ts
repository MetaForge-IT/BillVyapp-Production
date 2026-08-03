import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { customersService } from "./customers.service";
import type {
  CreateCustomerInput,
  RedeemLoyaltyInput,
  UpdateCustomerInput,
} from "./customers.validators";

export class CustomersController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const customers = await customersService.list(auth);
    sendSuccess(res, { message: "Customers retrieved", data: customers });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const customer = await customersService.getById(auth, String(req.params.customerId));
    sendSuccess(res, { message: "Customer retrieved", data: customer });
  });

  lookupByPhone = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const phone = String(req.query.phone ?? "").trim();
    if (!phone) {
      sendSuccess(res, { message: "Customer lookup", data: null });
      return;
    }
    const customer = await customersService.lookupByPhone(auth, phone);
    sendSuccess(res, { message: "Customer lookup", data: customer });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateCustomerInput;
    const customer = await customersService.create(auth, body);
    sendCreated(res, { message: "Customer created", data: customer });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateCustomerInput;
    const customer = await customersService.update(auth, String(req.params.customerId), body);
    sendSuccess(res, { message: "Customer updated", data: customer });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await customersService.delete(auth, String(req.params.customerId));
    sendNoContent(res);
  });

  getVisits = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const visits = await customersService.getVisits(auth, String(req.params.customerId));
    sendSuccess(res, { message: "Customer visits retrieved", data: visits });
  });

  getLoyalty = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const loyalty = await customersService.getLoyalty(auth, String(req.params.customerId));
    sendSuccess(res, { message: "Loyalty transactions retrieved", data: loyalty });
  });

  redeemLoyalty = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as RedeemLoyaltyInput;
    const result = await customersService.redeemLoyalty(auth, String(req.params.customerId), body);
    sendSuccess(res, { message: "Loyalty points redeemed", data: result });
  });
}

export const customersController = new CustomersController();
