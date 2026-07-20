import { z } from "zod";

export const createStockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  quantityChange: z.number().int().refine((value) => value !== 0, {
    message: "Quantity change must not be zero",
  }),
  note: z.string().trim().max(500).optional(),
  movementType: z.enum(["manual_adjustment", "service_used"]).optional(),
});

export const updateStockAdjustmentSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentSchema>;
export type UpdateStockAdjustmentInput = z.infer<typeof updateStockAdjustmentSchema>;
