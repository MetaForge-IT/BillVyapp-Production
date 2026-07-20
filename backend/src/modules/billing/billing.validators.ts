import { z } from "zod";
import { LINE_ITEM_TYPES, PAYMENT_METHODS } from "./billing.constants";

const lineItemSchema = z.object({
  lineType: z.enum(LINE_ITEM_TYPES),
  serviceId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  itemName: z.string().min(1).max(200),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
  lineDiscount: z.number().min(0).optional().default(0),
});

const billingBaseSchema = z.object({
  customerId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().min(5).max(20),
  source: z.enum(["appointment", "walk-in", "pos"]),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
  subtotal: z.number().min(0),
  discountAmount: z.number().min(0).optional().default(0),
  membershipDiscount: z.number().min(0).optional().default(0),
  couponDiscount: z.number().min(0).optional().default(0),
  // No .default() here: omitted vs. explicit 0 must stay distinguishable so the backend
  // can fall back to the salon's configured default GST rate only when truly omitted.
  gstRate: z.number().min(0).max(100).optional(),
  gstAmount: z.number().min(0).optional().default(0),
  totalAmount: z.number().min(0),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().date().optional(),
});

export const confirmOnlySchema = billingBaseSchema;

const paymentSchema = z
  .object({
    paymentMethod: z.enum(PAYMENT_METHODS),
    amount: z.number().positive(),
    reference: z.string().max(100).optional(),
    // Required when paymentMethod is "wallet" — identifies which membership enrollment's
    // wallet balance to debit.
    planEnrollmentId: z.string().uuid().optional(),
  })
  .refine((data) => data.paymentMethod !== "wallet" || !!data.planEnrollmentId, {
    message: "planEnrollmentId is required for wallet payments",
    path: ["planEnrollmentId"],
  });

export const checkoutSchema = billingBaseSchema.extend({
  payments: z.array(paymentSchema).min(1, "At least one payment is required"),
  loyaltyPointsEarned: z.number().int().min(0).optional().default(0),
});

export const collectPaymentSchema = z
  .object({
    amount: z.number().positive(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    reference: z.string().max(100).optional(),
    planEnrollmentId: z.string().uuid().optional(),
  })
  .refine((data) => data.paymentMethod !== "wallet" || !!data.planEnrollmentId, {
    message: "planEnrollmentId is required for wallet payments",
    path: ["planEnrollmentId"],
  });

export const requestRefundSchema = z.object({
  reason: z.string().min(3, "Refund reason is required").max(500),
});

export const approveRefundSchema = z.object({
  pin: z.string().min(4).max(6),
});

export type ConfirmOnlyInput = z.infer<typeof confirmOnlySchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CollectPaymentInput = z.infer<typeof collectPaymentSchema>;
export type RequestRefundInput = z.infer<typeof requestRefundSchema>;
export type ApproveRefundInput = z.infer<typeof approveRefundSchema>;
