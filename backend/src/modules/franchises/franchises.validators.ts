import { z } from "zod";

export const createFranchiseSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const updateFranchiseSchema = createFranchiseSchema.partial();

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
  isActive: z.boolean().optional(),
});

export const createStaffUserSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10).max(20).optional(),
  password: z.string().min(6).max(100),
  role: z.enum(["admin", "manager"]),
  franchiseId: z.string().uuid(),
  /** Required for manager; for admin = primary shop. */
  salonId: z.string().uuid(),
});

export type CreateFranchiseInput = z.infer<typeof createFranchiseSchema>;
export type UpdateFranchiseInput = z.infer<typeof updateFranchiseSchema>;
export type CreateShopInput = z.infer<typeof createShopSchema>;
export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;
