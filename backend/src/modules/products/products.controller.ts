import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { productsService } from "./products.service";
import type { CreateProductInput, UpdateProductInput } from "./products.validators";

export class ProductsController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const { categoryId, status, stockStatus, search } = req.query;
    const products = await productsService.list(auth, {
      categoryId: typeof categoryId === "string" ? categoryId : undefined,
      status: typeof status === "string" ? status : undefined,
      stockStatus: typeof stockStatus === "string" ? stockStatus : undefined,
      search: typeof search === "string" ? search : undefined,
    });
    sendSuccess(res, { message: "Products retrieved", data: products });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const product = await productsService.getById(auth, String(req.params.productId));
    sendSuccess(res, { message: "Product retrieved", data: product });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateProductInput;
    const product = await productsService.create(auth, body);
    sendCreated(res, { message: "Product created", data: product });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateProductInput;
    const product = await productsService.update(auth, String(req.params.productId), body);
    sendSuccess(res, { message: "Product updated", data: product });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await productsService.delete(auth, String(req.params.productId));
    sendNoContent(res);
  });
}

export const productsController = new ProductsController();
