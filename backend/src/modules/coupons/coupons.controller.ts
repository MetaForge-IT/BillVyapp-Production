import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { couponsService } from "./coupons.service";
import type { CreateCouponInput, UpdateCouponInput } from "./coupons.validators";

export class CouponsController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const coupons = await couponsService.list(auth, status);
    sendSuccess(res, { message: "Coupons retrieved", data: coupons });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const coupon = await couponsService.getById(auth, String(req.params.couponId));
    sendSuccess(res, { message: "Coupon retrieved", data: coupon });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateCouponInput;
    const coupon = await couponsService.create(auth, body);
    sendCreated(res, { message: "Coupon created", data: coupon });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateCouponInput;
    const coupon = await couponsService.update(auth, String(req.params.couponId), body);
    sendSuccess(res, { message: "Coupon updated", data: coupon });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await couponsService.delete(auth, String(req.params.couponId));
    sendNoContent(res);
  });
}

export const couponsController = new CouponsController();
