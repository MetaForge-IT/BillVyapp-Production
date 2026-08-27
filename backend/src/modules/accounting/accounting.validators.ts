import { z } from "zod";
import { BUDGET_LINE_TYPES, EXPENSE_CATEGORIES, EXPENSE_SOURCES } from "./accounting.constants";

export const createExpenseSchema = z.object({
  date: z.string().date().optional(),
  category: z.enum(EXPENSE_CATEGORIES),
  subCategory: z.string().trim().min(1).max(200),
  amount: z.number().min(0.01),
  source: z.enum(EXPENSE_SOURCES),
  remarks: z.string().trim().min(1, "Note is required").max(500),
  /** Franchise admin: create expense for a specific shop. */
  salonId: z.string().uuid().optional(),
});

export const updateExpenseSchema = z.object({
  date: z.string().date().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  subCategory: z.string().trim().min(1).max(200).optional(),
  amount: z.number().min(0.01).optional(),
  source: z.enum(EXPENSE_SOURCES).optional(),
  remarks: z.string().trim().min(1, "Note is required").max(500).optional(),
});

export const listExpensesQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  category: z.string().trim().min(1).max(100).optional(),
  salonId: z.string().uuid().optional(),
});

export const accountingOverviewQuerySchema = z.object({
  date: z.string().date().optional(),
  salonId: z.string().uuid().optional(),
});

export const upsertBudgetSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  lines: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(200),
        type: z.enum(BUDGET_LINE_TYPES),
        allocated: z.number().min(0),
      }),
    )
    .max(200),
});

export const createDayCloseSchema = z.object({
  closingDate: z.string().date().optional(),
  physicalCash: z.number().min(0),
  varianceNote: z.string().trim().max(2000).optional().nullable(),
  upiSettled: z.number().min(0).optional().default(0),
  cardSettled: z.number().min(0).optional().default(0),
  bankDrop: z.number().min(0).optional().default(0),
  denomCounts: z.record(z.string(), z.number().int().min(0)).optional().nullable(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
export type AccountingOverviewQuery = z.infer<typeof accountingOverviewQuerySchema>;
export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;
export type CreateDayCloseInput = z.infer<typeof createDayCloseSchema>;
