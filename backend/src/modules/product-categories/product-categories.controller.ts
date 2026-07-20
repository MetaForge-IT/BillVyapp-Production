import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { productCategoriesService } from "./product-categories.service";
import type {
  CreateProductCategoryInput,
  UpdateProductCategoryInput,
} from "./product-categories.validators";

export class ProductCategoriesController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const categories = await productCategoriesService.list(auth);
    sendSuccess(res, { message: "Product categories retrieved", data: categories });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const category = await productCategoriesService.getById(auth, String(req.params.categoryId));
    sendSuccess(res, { message: "Product category retrieved", data: category });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateProductCategoryInput;
    const category = await productCategoriesService.create(auth, body);
    sendCreated(res, { message: "Product category created", data: category });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateProductCategoryInput;
    const category = await productCategoriesService.update(auth, String(req.params.categoryId), body);
    sendSuccess(res, { message: "Product category updated", data: category });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await productCategoriesService.delete(auth, String(req.params.categoryId));
    sendNoContent(res);
  });
}

export const productCategoriesController = new ProductCategoriesController();
