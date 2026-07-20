export const PLAN_TYPES = ["membership", "package"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const NAME_PRESETS = ["basic", "silver", "gold", "platinum", "custom"] as const;
export type NamePreset = (typeof NAME_PRESETS)[number];

export const ENROLLMENT_STATUS = {
  ACTIVE: "active",
  EXHAUSTED: "exhausted",
  EXPIRED: "expired",
} as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUS)[keyof typeof ENROLLMENT_STATUS];

export const PLANS_ERROR_CODES = {
  PLAN_NOT_FOUND: "PLAN_NOT_FOUND",
  CUSTOMER_NOT_FOUND: "CUSTOMER_NOT_FOUND",
  SERVICE_NOT_FOUND: "SERVICE_NOT_FOUND",
  ENROLLMENT_NOT_FOUND: "ENROLLMENT_NOT_FOUND",
} as const;
