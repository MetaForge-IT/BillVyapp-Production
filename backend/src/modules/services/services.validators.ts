import { z } from "zod";
import { SERVICE_STATUS } from "./services.constants";
import { paginationQuerySchema } from "../../utils/pagination";

export const serviceGenderSchema = z.enum(["MALE", "FEMALE", "UNISEX"]);

export const createServiceSchema = z.object({
  /** Short UI label (e.g. Cheeks). Falls back to `name` when omitted. */
  displayName: z.string().trim().min(1).max(200).optional(),
  /** Full searchable name. Auto-built from category + group + display when omitted. */
  name: z.string().trim().min(1).max(200).optional(),
  /** Immutable code — auto-generated when omitted. */
  serviceCode: z.string().trim().min(2).max(64).optional(),
  categoryId: z.string().uuid(),
  serviceGroup: z.string().trim().min(1).max(100).optional().nullable(),
  description: z.string().trim().max(2000).optional(),
  duration: z.number().int().positive(),
  price: z.number().nonnegative(),
  tax: z.number().min(0).max(100).optional(),
  popularity: z.number().int().min(0).max(100).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  gender: serviceGenderSchema.optional(),
  status: z.enum([SERVICE_STATUS.ACTIVE, SERVICE_STATUS.INACTIVE]).optional(),
  memberPrice: z.number().nonnegative().optional(),
  /** Franchise admin: create under a specific shop (category must belong to that shop). */
  salonId: z.string().uuid().optional(),
}).refine((data) => Boolean(data.displayName || data.name), {
  message: "Either displayName or name is required",
  path: ["displayName"],
});

export const updateServiceSchema = z.object({
  displayName: z.string().trim().min(1).max(200).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  serviceGroup: z.string().trim().min(1).max(100).optional().nullable(),
  description: z.string().trim().max(2000).optional(),
  duration: z.number().int().positive().optional(),
  price: z.number().nonnegative().optional(),
  tax: z.number().min(0).max(100).optional().nullable(),
  popularity: z.number().int().min(0).max(100).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  gender: serviceGenderSchema.optional(),
  status: z.enum([SERVICE_STATUS.ACTIVE, SERVICE_STATUS.INACTIVE]).optional(),
  memberPrice: z.number().nonnegative().optional().nullable(),
});

export const listServicesQuerySchema = paginationQuerySchema.extend({
  gender: serviceGenderSchema.optional(),
  categoryId: z.string().uuid().optional(),
  serviceGroup: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().max(200).optional(),
  salonId: z.string().uuid().optional(),
  active: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return v === "true" || v === "1";
    }),
  sort: z
    .enum(["sortOrder", "name", "displayName", "price", "createdAt", "popularity"])
    .optional()
    .default("sortOrder"),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
