import { z } from "zod";

export const createManagerSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10).max(20).optional(),
  password: z.string().min(6).max(100),
  salonId: z.string().uuid(),
});

export const createShopSchema = z.object({
  name: z.string().trim().min(2).max(200),
  displayName: z.string().trim().max(100).optional(),
  code: z.string().trim().max(40).optional(),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8).max(20),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(20).optional(),
});

export const updateShopAddressSchema = z.object({
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(20).optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  displayName: z.string().trim().max(100).optional().or(z.literal("")),
});

export type CreateManagerInput = z.infer<typeof createManagerSchema>;
export type CreateShopInput = z.infer<typeof createShopSchema>;
export type UpdateShopAddressInput = z.infer<typeof updateShopAddressSchema>;
