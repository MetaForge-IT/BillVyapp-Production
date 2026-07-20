import { z } from "zod";
import { ROUND_OFF_MODES } from "./settings.constants";

const salonProfileSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  tagline: z.string().trim().max(500).optional().nullable(),
  address: z.string().trim().max(2000).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  pincode: z.string().trim().max(20).optional().nullable(),
  phone: z.string().trim().min(10).max(20).optional(),
  email: z.string().trim().email().optional(),
  website: z.string().trim().max(255).optional().nullable(),
  gstin: z.string().trim().max(15).optional().nullable(),
  logoUrl: z.string().trim().max(500).optional().nullable(),
  timezone: z.string().trim().max(50).optional(),
  currency: z.string().trim().length(3).optional(),
});

const dayHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  close: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closed: z.boolean().optional(),
});

const businessHoursSchema = z.record(z.string(), dayHoursSchema);

const financialSettingsSchema = z.object({
  gstEnabled: z.boolean().optional(),
  defaultGstRate: z.number().min(0).max(100).optional(),
  loyaltyPointsPerRupee: z.number().min(0).optional(),
  loyaltyRupeePerPoint: z.number().min(0).optional(),
  maxDiscountPercent: z.number().min(0).max(100).optional(),
  roundOffMode: z.enum(ROUND_OFF_MODES).optional(),
  receiptPrefix: z.string().trim().max(10).optional(),
});

const notificationSettingsSchema = z.object({
  lowStockAlerts: z.boolean().optional(),
  lowStockThresholdQty: z.number().int().min(0).optional(),
  appointmentReminderEnabled: z.boolean().optional(),
  reminderMinutesBefore: z.number().int().min(0).optional(),
  dailySummaryEnabled: z.boolean().optional(),
  dailySummaryTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  paymentAlerts: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
});

export const updateSettingsSchema = z.object({
  salon: salonProfileSchema.optional(),
  businessHours: businessHoursSchema.optional(),
  financial: financialSettingsSchema.optional(),
  notifications: notificationSettingsSchema.optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
