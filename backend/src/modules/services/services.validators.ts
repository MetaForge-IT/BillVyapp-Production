import { z } from "zod";
import { SERVICE_STATUS } from "./services.constants";

export const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  categoryId: z.string().uuid(),
  description: z.string().trim().max(2000).optional(),
  duration: z.number().int().positive(),
  price: z.number().nonnegative(),
  tax: z.number().min(0).max(100).optional(),
  popularity: z.number().int().min(0).max(100).optional(),
  status: z.enum([SERVICE_STATUS.ACTIVE, SERVICE_STATUS.INACTIVE]).optional(),
  memberPrice: z.number().nonnegative().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
