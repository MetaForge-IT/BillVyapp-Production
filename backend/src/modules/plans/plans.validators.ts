import { z } from "zod";
import { NAME_PRESETS, PLAN_TYPES } from "./plans.constants";

const includedServiceSchema = z.object({
  serviceId: z.string().uuid(),
  quantity: z.number().int().min(1).max(999).optional().default(1),
});

const planBaseSchema = z.object({
  namePreset: z.enum(NAME_PRESETS),
  customName: z.string().min(1).max(200).optional(),
  planType: z.enum(PLAN_TYPES),
  price: z.number().min(0),
  walletAmount: z.number().min(0).optional().nullable(),
  validityDays: z.number().int().min(1).max(3650),
  serviceLimit: z.number().int().min(0).max(9999).optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  includedServices: z.array(includedServiceSchema).optional().default([]),
});

const requireCustomName = (
  data: { namePreset?: string; customName?: string },
  ctx: z.RefinementCtx,
) => {
  if (data.namePreset === "custom" && !data.customName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Custom name is required when preset is custom",
      path: ["customName"],
    });
  }
};

export const createPlanSchema = planBaseSchema.superRefine(requireCustomName);

export const updatePlanSchema = planBaseSchema.partial().superRefine(requireCustomName);

export const enrollCustomerSchema = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid(),
  amountPaid: z.number().min(0).optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type EnrollCustomerInput = z.infer<typeof enrollCustomerSchema>;
