export const EXPENSE_CATEGORIES = ["Operational", "Inventory", "Payroll", "Transfer"] as const;
export const EXPENSE_SOURCES = ["Cash", "UPI", "Card"] as const;
export const BUDGET_LINE_TYPES = ["fixed", "variable"] as const;

export const ACCOUNTING_ERROR_CODES = {
  EXPENSE_NOT_FOUND: "EXPENSE_NOT_FOUND",
  EXPENSE_DELETE_ALREADY_REQUESTED: "EXPENSE_DELETE_ALREADY_REQUESTED",
  EXPENSE_DELETE_NOT_REQUESTED: "EXPENSE_DELETE_NOT_REQUESTED",
  DAY_CLOSED: "DAY_CLOSED",
  DAY_CLOSE_EXISTS: "DAY_CLOSE_EXISTS",
  DAY_CLOSE_NOT_FOUND: "DAY_CLOSE_NOT_FOUND",
  VARIANCE_NOTE_REQUIRED: "VARIANCE_NOTE_REQUIRED",
  INVALID_DATE: "INVALID_DATE",
} as const;

export const DAY_CLOSE_ROLES = ["manager", "accountant"] as const;

/** Roles that hard-delete expenses (approve pending or delete directly). */
export const EXPENSE_DELETE_APPROVER_ROLES = ["admin"] as const;

/** Roles that request deletion for admin approval (cannot hard-delete). */
export const EXPENSE_DELETE_REQUESTOR_ROLES = ["manager"] as const;
