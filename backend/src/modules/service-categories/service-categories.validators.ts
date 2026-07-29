import { z } from "zod";
import { SERVICE_CATEGORY_STATUS } from "./service-categories.constants";

export const createServiceCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional(),
  icon: z.string().trim().max(100).optional().nullable(),
  status: z.enum([SERVICE_CATEGORY_STATUS.ACTIVE, SERVICE_CATEGORY_STATUS.INACTIVE]).optional(),
  sortOrder: z.number().int().min(0).max(32767).optional(),
});

export const updateServiceCategorySchema = createServiceCategorySchema.partial();

export type CreateServiceCategoryInput = z.infer<typeof createServiceCategorySchema>;
export type UpdateServiceCategoryInput = z.infer<typeof updateServiceCategorySchema>;
