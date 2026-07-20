export const APPOINTMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;

export const APPOINTMENT_TYPE = {
  APPOINTMENT: "appointment",
  WALK_IN: "walk_in",
} as const;

export const APPOINTMENT_ERROR_CODES = {
  NOT_FOUND: "APPOINTMENT_NOT_FOUND",
  CUSTOMER_NOT_FOUND: "CUSTOMER_NOT_FOUND",
  SERVICE_NOT_FOUND: "SERVICE_NOT_FOUND",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;
