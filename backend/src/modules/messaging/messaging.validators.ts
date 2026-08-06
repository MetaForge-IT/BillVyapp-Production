import { z } from "zod";

export const sendCouponWhatsAppSchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().min(1).max(40),
  valueLabel: z.string().min(1).max(80),
  validUntil: z.string().min(1).max(40),
  customerName: z.string().max(120).optional(),
});

export const sendFeedbackRequestWhatsAppSchema = z.object({
  phone: z.string().min(8).max(20),
  customerName: z.string().max(120).optional(),
  feedbackUrl: z.string().url().optional(),
});

export const sendBirthdayOfferWhatsAppSchema = z.object({
  phone: z.string().min(8).max(20),
  customerName: z.string().min(1).max(120),
  offerLabel: z.string().min(1).max(80),
  validUntil: z.string().min(1).max(40),
});

export type SendCouponWhatsAppInput = z.infer<typeof sendCouponWhatsAppSchema>;
export type SendFeedbackRequestWhatsAppInput = z.infer<typeof sendFeedbackRequestWhatsAppSchema>;
export type SendBirthdayOfferWhatsAppInput = z.infer<typeof sendBirthdayOfferWhatsAppSchema>;
