import { z } from "zod";

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(10).max(20),
  email: z.string().trim().email().optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional(),
  dateOfBirth: z.string().date().optional(),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  gstin: z.string().trim().max(15).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  source: z.enum(["walk-in", "online", "unknown"]).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const redeemLoyaltySchema = z.object({
  points: z.number().int().min(1),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type RedeemLoyaltyInput = z.infer<typeof redeemLoyaltySchema>;

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  search: z.string().trim().max(200).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
