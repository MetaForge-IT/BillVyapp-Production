import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { membershipTiersService } from "./membership-tiers.service";

export class MembershipTiersController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const tiers = await membershipTiersService.listActive(auth);
    sendSuccess(res, { message: "Membership tiers retrieved", data: tiers });
  });
}

export const membershipTiersController = new MembershipTiersController();
