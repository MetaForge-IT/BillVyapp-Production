export const NOTIFICATION_CATEGORY = {
  APPOINTMENT: "appointment",
  PAYMENT: "payment",
  INVENTORY: "inventory",
  WARNING: "warning",
  SUCCESS: "success",
  SYSTEM: "system",
} as const;

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORY)[keyof typeof NOTIFICATION_CATEGORY];

export const NOTIFICATION_REFERENCE_TYPE = {
  APPOINTMENT: "appointment",
  INVOICE: "invoice",
  PRODUCT: "product",
  ENROLLMENT: "enrollment",
  CUSTOMER: "customer",
  FEEDBACK: "feedback",
} as const;

export const NOTIFICATION_ERROR_CODES = {
  NOT_FOUND: "NOTIFICATION_NOT_FOUND",
} as const;
