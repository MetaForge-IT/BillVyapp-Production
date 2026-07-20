import { z } from "zod";
import { PRODUCT_STATUS } from "./products.constants";

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  categoryId: z.string().uuid(),
  brand: z.string().trim().max(100).optional(),
  vendorId: z.string().uuid().optional(),
  barcode: z.string().trim().max(50).optional(),
  sku: z.string().trim().min(1).max(50),
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  gstRate: z.number().min(0).max(100).optional(),
  currentStock: z.number().int().min(0).optional(),
  minimumStock: z.number().int().min(0).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  status: z.enum([PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE]).optional(),
});

export const updateProductSchema = createProductSchema.omit({ currentStock: true }).partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
