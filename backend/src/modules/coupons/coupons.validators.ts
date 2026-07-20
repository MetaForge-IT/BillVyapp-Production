import { z } from "zod";
import { COUPON_STATUS, COUPON_TYPE } from "./coupons.constants";

const couponBaseSchema = z.object({
  code: z.string().trim().min(1).max(30),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  type: z.enum([COUPON_TYPE.PERCENTAGE, COUPON_TYPE.FLAT]),
  value: z.number().min(0),
  minSpend: z.number().min(0).optional().default(0),
  maxDiscount: z.number().min(0).optional().nullable(),
  validFrom: z.string().date(),
  validTill: z.string().date(),
  usageLimit: z.number().int().min(0).optional().default(0),
  applicableTo: z.string().trim().max(100).optional().default("all"),
  status: z
    .enum([COUPON_STATUS.ACTIVE, COUPON_STATUS.EXPIRED, COUPON_STATUS.DISABLED])
    .optional()
    .default(COUPON_STATUS.ACTIVE),
});

export const createCouponSchema = couponBaseSchema;

export const updateCouponSchema = couponBaseSchema.partial();

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
