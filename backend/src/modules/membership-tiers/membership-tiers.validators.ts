import { z } from "zod";

export const listMembershipTiersQuerySchema = z.object({
  activeOnly: z.coerce.boolean().optional().default(true),
});
