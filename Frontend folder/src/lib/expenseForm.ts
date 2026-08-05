import Joi from "joi";
import type { ExpenseCategory, ExpenseSource } from "../api/accounting";

export const EXPENSE_CATEGORIES = ["Operational", "Inventory", "Payroll", "Transfer"] as const;
export const EXPENSE_SOURCES = ["Cash", "UPI", "Card"] as const;

const EMP_PREFIX = "EMP:";

export interface ExpenseFormValues {
  date: string;
  category: ExpenseCategory;
  subCategory: string;
  /** Optional — shown when category is Payroll */
  employeeName: string;
  amount: string;
  source: ExpenseSource;
  note: string;
}

export const expenseFormSchema = Joi.object<ExpenseFormValues>({
  date: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.empty": "Date is required",
      "string.pattern.base": "Date is required",
      "any.required": "Date is required",
    }),
  category: Joi.string()
    .valid(...EXPENSE_CATEGORIES)
    .required()
    .messages({ "any.only": "Select a valid category" }),
  subCategory: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Sub-category is required",
    "any.required": "Sub-category is required",
  }),
  employeeName: Joi.string().trim().max(120).allow("").optional(),
  amount: Joi.string()
    .trim()
    .pattern(/^\d+(\.\d{1,2})?$/)
    .required()
    .custom((value, helpers) => {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0.01) {
        return helpers.error("number.min");
      }
      return value;
    })
    .messages({
      "string.empty": "Amount is required",
      "string.pattern.base": "Enter a valid amount",
      "number.min": "Amount must be at least ₹0.01",
      "any.required": "Amount is required",
    }),
  source: Joi.string()
    .valid(...EXPENSE_SOURCES)
    .required()
    .messages({ "any.only": "Select Cash, UPI, or Card" }),
  note: Joi.string().trim().min(1).max(500).required().messages({
    "string.empty": "Note is required",
    "string.min": "Note is required",
    "string.max": "Note must be at most 500 characters",
    "any.required": "Note is required",
  }),
});

/** Pack optional employee into remarks without a DB column. */
export function packExpenseRemarks(note: string, employeeName?: string): string {
  const cleanNote = note.trim();
  const emp = employeeName?.trim();
  if (!emp) return cleanNote;
  return `${EMP_PREFIX}${emp}\n${cleanNote}`.slice(0, 500);
}

export function parseExpenseRemarks(remarks?: string | null): {
  employeeName: string | null;
  note: string;
} {
  const raw = (remarks ?? "").trim();
  if (!raw.startsWith(EMP_PREFIX)) {
    return { employeeName: null, note: raw };
  }
  const rest = raw.slice(EMP_PREFIX.length);
  const nl = rest.indexOf("\n");
  if (nl < 0) {
    return { employeeName: rest.trim() || null, note: "" };
  }
  return {
    employeeName: rest.slice(0, nl).trim() || null,
    note: rest.slice(nl + 1).trim(),
  };
}

export function validateExpenseForm(values: ExpenseFormValues): {
  ok: true;
  value: {
    date: string;
    category: ExpenseCategory;
    subCategory: string;
    amount: number;
    source: ExpenseSource;
    remarks: string;
  };
} | { ok: false; error: string; field?: string } {
  const { error, value } = expenseFormSchema.validate(values, {
    abortEarly: true,
    stripUnknown: true,
  });
  if (error) {
    const detail = error.details[0];
    return {
      ok: false,
      error: detail?.message ?? "Invalid expense",
      field: detail?.path?.[0] != null ? String(detail.path[0]) : undefined,
    };
  }
  const employeeName = value.category === "Payroll" ? value.employeeName?.trim() ?? "" : "";
  return {
    ok: true,
    value: {
      date: value.date,
      category: value.category,
      subCategory: value.subCategory,
      amount: Number(value.amount),
      source: value.source,
      remarks: packExpenseRemarks(value.note, employeeName),
    },
  };
}

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
