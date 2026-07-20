import { z } from "zod";

export const createAdvanceSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(10).max(20),
  service: z.string().trim().max(200).optional().nullable(),
  amount: z.number().min(0.01),
  bookedFor: z.string().date().optional().nullable(),
  source: z.string().trim().max(50).optional().default("manual"),
});

export const updateAdvanceSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().min(10).max(20).optional(),
  service: z.string().trim().max(200).optional().nullable(),
  amount: z.number().min(0.01).optional(),
  bookedFor: z.string().date().optional().nullable(),
  source: z.string().trim().max(50).optional(),
});

export const deductAdvanceSchema = z.object({
  amount: z.number().min(0.01),
});

export type CreateAdvanceInput = z.infer<typeof createAdvanceSchema>;
export type UpdateAdvanceInput = z.infer<typeof updateAdvanceSchema>;
export type DeductAdvanceInput = z.infer<typeof deductAdvanceSchema>;
