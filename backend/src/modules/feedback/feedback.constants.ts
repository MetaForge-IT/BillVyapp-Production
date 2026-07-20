export const FEEDBACK_STATUS = {
  NEW: "new",
  REVIEWED: "reviewed",
  RESOLVED: "resolved",
} as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUS)[keyof typeof FEEDBACK_STATUS];

export const FEEDBACK_SENTIMENT = {
  POSITIVE: "positive",
  NEUTRAL: "neutral",
  NEGATIVE: "negative",
} as const;

export const FEEDBACK_SOURCE = {
  APP: "app",
  GOOGLE: "google",
  SMS: "sms",
} as const;

export const FEEDBACK_ERROR_CODES = {
  NOT_FOUND: "FEEDBACK_NOT_FOUND",
  APPOINTMENT_NOT_FOUND: "FEEDBACK_APPOINTMENT_NOT_FOUND",
  APPOINTMENT_NOT_COMPLETED: "FEEDBACK_APPOINTMENT_NOT_COMPLETED",
  DUPLICATE_APPOINTMENT: "FEEDBACK_DUPLICATE_APPOINTMENT",
  INVALID_RATING: "FEEDBACK_INVALID_RATING",
} as const;

export function computeSentiment(rating: number): string {
  if (rating >= 4) return FEEDBACK_SENTIMENT.POSITIVE;
  if (rating === 3) return FEEDBACK_SENTIMENT.NEUTRAL;
  return FEEDBACK_SENTIMENT.NEGATIVE;
}
