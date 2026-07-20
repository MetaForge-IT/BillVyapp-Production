export const SEARCH_RESULT_TYPES = {
  CUSTOMER: "customer",
  APPOINTMENT: "appointment",
  SERVICE: "service",
  INVOICE: "invoice",
} as const;

export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[keyof typeof SEARCH_RESULT_TYPES];

export const SEARCH_LIMIT_PER_TYPE = 10;
