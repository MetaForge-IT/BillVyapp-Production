import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { servicesService } from "./services.service";
import type { CreateServiceInput, UpdateServiceInput } from "./services.validators";
import { listServicesQuerySchema } from "./services.validators";

export class ServicesController {
  listCatalog = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const catalog = await servicesService.listCatalog(auth);
    sendSuccess(res, { message: "Service catalog retrieved", data: catalog });
  });

  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const query = listServicesQuerySchema.parse(req.query);
    const result = await servicesService.list(auth, query);
    sendSuccess(res, { message: "Services retrieved", data: result });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const service = await servicesService.getById(auth, String(req.params.serviceId));
    sendSuccess(res, { message: "Service retrieved", data: service });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateServiceInput;
    const service = await servicesService.create(auth, body);
    sendCreated(res, { message: "Service created", data: service });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateServiceInput;
    const service = await servicesService.update(auth, String(req.params.serviceId), body);
    sendSuccess(res, { message: "Service updated", data: service });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await servicesService.delete(auth, String(req.params.serviceId));
    sendNoContent(res);
  });
}

export const servicesController = new ServicesController();
