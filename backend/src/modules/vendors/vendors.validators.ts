import { z } from "zod";
import { VENDOR_STATUS } from "./vendors.constants";

export const createVendorSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactPerson: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email().max(255).optional(),
  address: z.string().trim().max(2000).optional(),
  gstin: z.string().trim().max(15).optional(),
  paymentTerms: z.string().trim().max(100).optional(),
  status: z.enum([VENDOR_STATUS.ACTIVE, VENDOR_STATUS.INACTIVE]).optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
