import { z } from "zod";

export const listStaffQuerySchema = z.object({
  activeOnly: z.coerce.boolean().optional().default(true),
});
