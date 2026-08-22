import { z } from "zod";

export const listDashboardQuerySchema = z.object({
  /** Franchise admin: scope panels to one shop (omit for all shops combined). */
  salonId: z.string().uuid().optional(),
});

export type ListDashboardQuery = z.infer<typeof listDashboardQuerySchema>;
