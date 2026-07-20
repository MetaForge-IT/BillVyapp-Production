import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { serviceCategoriesService } from "./service-categories.service";
import type {
  CreateServiceCategoryInput,
  UpdateServiceCategoryInput,
} from "./service-categories.validators";

export class ServiceCategoriesController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const categories = await serviceCategoriesService.list(auth);
    sendSuccess(res, { message: "Service categories retrieved", data: categories });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const category = await serviceCategoriesService.getById(auth, String(req.params.categoryId));
    sendSuccess(res, { message: "Service category retrieved", data: category });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateServiceCategoryInput;
    const category = await serviceCategoriesService.create(auth, body);
    sendCreated(res, { message: "Service category created", data: category });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateServiceCategoryInput;
    const category = await serviceCategoriesService.update(auth, String(req.params.categoryId), body);
    sendSuccess(res, { message: "Service category updated", data: category });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await serviceCategoriesService.delete(auth, String(req.params.categoryId));
    sendNoContent(res);
  });
}

export const serviceCategoriesController = new ServiceCategoriesController();
