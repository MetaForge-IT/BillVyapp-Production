import { z } from "zod";

const purchaseItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitCost: z.number().min(0),
});

export const createStockPurchaseSchema = z.object({
  vendorId: z.string().uuid(),
  orderDate: z.string().date().optional(),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(purchaseItemSchema).min(1),
});

export const updateStockPurchaseSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});

export type CreateStockPurchaseInput = z.infer<typeof createStockPurchaseSchema>;
export type UpdateStockPurchaseInput = z.infer<typeof updateStockPurchaseSchema>;
