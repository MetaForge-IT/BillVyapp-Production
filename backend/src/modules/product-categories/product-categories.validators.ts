import { z } from "zod";
import { PRODUCT_CATEGORY_STATUS } from "./product-categories.constants";

export const createProductCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional(),
  status: z.enum([PRODUCT_CATEGORY_STATUS.ACTIVE, PRODUCT_CATEGORY_STATUS.INACTIVE]).optional(),
  sortOrder: z.number().int().min(0).max(32767).optional(),
});

export const updateProductCategorySchema = createProductCategorySchema.partial();

export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;
