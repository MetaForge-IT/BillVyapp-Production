import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { serviceProductLinksService } from "./service-product-links.service";
import type { ReplaceServiceProductLinksInput } from "./service-product-links.validators";

export class ServiceProductLinksController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const serviceId =
      typeof req.query.serviceId === "string" ? req.query.serviceId : undefined;

    const data = serviceId
      ? await serviceProductLinksService.listByServiceId(auth, serviceId)
      : await serviceProductLinksService.listGrouped(auth);

    sendSuccess(res, { message: "Service product links retrieved", data });
  });

  replace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as ReplaceServiceProductLinksInput;
    const data = await serviceProductLinksService.replaceForService(
      auth,
      String(req.params.serviceId),
      body,
    );
    sendSuccess(res, { message: "Service product links updated", data });
  });
}

export const serviceProductLinksController = new ServiceProductLinksController();
