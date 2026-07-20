import { z } from "zod";
import { NOTIFICATION_CATEGORY } from "./app-notifications.constants";

export const createNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  category: z.enum([
    NOTIFICATION_CATEGORY.APPOINTMENT,
    NOTIFICATION_CATEGORY.PAYMENT,
    NOTIFICATION_CATEGORY.INVENTORY,
    NOTIFICATION_CATEGORY.WARNING,
    NOTIFICATION_CATEGORY.SUCCESS,
    NOTIFICATION_CATEGORY.SYSTEM,
  ]),
  actionHref: z.string().max(255).optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().max(50).optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
