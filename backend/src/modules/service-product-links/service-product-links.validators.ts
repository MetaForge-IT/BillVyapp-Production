import { z } from "zod";

const linkItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  sku: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  defaultQty: z.number().int().min(1).optional().default(1),
  unit: z.string().trim().max(20).optional().default("piece"),
  wasteBuffer: z.number().int().min(0).optional().default(0),
  minQty: z.number().int().min(1).optional().default(1),
  maxQty: z.number().int().min(1).optional().default(99),
});

export const replaceServiceProductLinksSchema = z.object({
  links: z.array(linkItemSchema),
});

export type ReplaceServiceProductLinksInput = z.infer<typeof replaceServiceProductLinksSchema>;
