export const CUSTOMER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export const CUSTOMER_ERROR_CODES = {
  NOT_FOUND: "CUSTOMER_NOT_FOUND",
  DUPLICATE_PHONE: "CUSTOMER_DUPLICATE_PHONE",
  INSUFFICIENT_LOYALTY_POINTS: "CUSTOMER_INSUFFICIENT_LOYALTY_POINTS",
} as const;

export const LOYALTY_TRANSACTION_TYPE = {
  EARN: "earn",
  REDEEM: "redeem",
  ADJUST: "adjust",
} as const;
