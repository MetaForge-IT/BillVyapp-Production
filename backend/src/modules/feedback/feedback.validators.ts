import { z } from "zod";
import { FEEDBACK_SOURCE, FEEDBACK_STATUS } from "./feedback.constants";

export const createFeedbackSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(5000).optional(),
  source: z
    .enum([FEEDBACK_SOURCE.APP, FEEDBACK_SOURCE.GOOGLE, FEEDBACK_SOURCE.SMS])
    .optional(),
});

export const updateFeedbackSchema = z.object({
  status: z
    .enum([FEEDBACK_STATUS.NEW, FEEDBACK_STATUS.REVIEWED, FEEDBACK_STATUS.RESOLVED])
    .optional(),
  replyText: z.string().max(5000).optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
