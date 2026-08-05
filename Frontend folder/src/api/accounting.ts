import { apiClient } from "../lib/axios";

export type ExpenseCategory = "Operational" | "Inventory" | "Payroll" | "Transfer";
export type ExpenseSource = "Cash" | "UPI" | "Card";
export type BudgetLineType = "fixed" | "variable";

export interface AccountingExpense {
  id: string;
  date: string;
  category: ExpenseCategory | string;
  sub: string;
  subCategory: string;
  amount: number;
  source: ExpenseSource | string;
  remarks: string;
  /** True when a manager has requested admin approval to delete. */
  deleteRequested?: boolean;
  deleteRequestedAt?: string | null;
  deleteRequestedById?: string | null;
  deleteRequestedByName?: string | null;
  /** True when admin rejected the last delete request (cleared on new request). */
  deleteRejected?: boolean;
  deleteRejectedAt?: string | null;
  deleteRejectedById?: string | null;
  deleteRejectedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpensePayload {
  date?: string;
  category: ExpenseCategory;
  subCategory: string;
  amount: number;
  source: ExpenseSource;
  /** Compulsory note (validated on API + Joi form). */
  remarks: string;
}

export interface BudgetLine {
  id: string;
  name: string;
  type: BudgetLineType;
  allocated: number;
  used: number;
}

export interface BudgetPeriod {
  id?: string;
  year: number;
  month: number;
  lines: BudgetLine[];
}

export interface UpsertBudgetPayload {
  year: number;
  month: number;
  lines: Array<{
    id?: string;
    name: string;
    type: BudgetLineType;
    allocated: number;
  }>;
}

export interface DayCloseRecord {
  id: string;
  closingDate: string;
  status: string;
  openingCash: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  totalExpenses: number;
  cashExpenses: number;
  expectedCash: number;
  physicalCash: number;
  variance: number;
  varianceNote: string | null;
  upiSettled: number;
  cardSettled: number;
  bankDrop: number;
  denomCounts: Record<string, number> | null;
  closedBy: string | null;
  closedAt: string | null;
  createdAt: string;
}

export interface AccountingOverview {
  date: string;
  isClosed: boolean;
  openingCash: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  otherSales: number;
  totalSales: number;
  totalExpenses: number;
  cashExpenses: number;
  expensesByCategory: Record<string, number>;
  expectedCash: number;
  netPosition: number;
  dayClose: DayCloseRecord | null;
  weekly: Array<{ day: string; date: string; revenue: number; expenses: number }>;
  period: {
    revenue: number;
    expenses: number;
    netProfit: number;
    gstCollected: number;
    discount: number;
  };
}

export interface DayCloseSnapshot {
  date: string;
  isClosed: boolean;
  openingCash: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  otherSales: number;
  totalSales: number;
  totalExpenses: number;
  cashExpenses: number;
  expensesByCategory: Record<string, number>;
  expectedCash: number;
  netPosition: number;
  dayClose: DayCloseRecord | null;
}

export interface CreateDayClosePayload {
  closingDate?: string;
  physicalCash: number;
  varianceNote?: string | null;
  upiSettled?: number;
  cardSettled?: number;
  bankDrop?: number;
  denomCounts?: Record<string, number> | null;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchAccountingOverview(date?: string): Promise<AccountingOverview> {
  const { data } = await apiClient.get<ApiEnvelope<AccountingOverview>>("/accounting/overview", {
    params: date ? { date } : undefined,
  });
  return data.data;
}

export async function fetchExpenses(params?: {
  from?: string;
  to?: string;
  category?: string;
}): Promise<AccountingExpense[]> {
  const { data } = await apiClient.get<ApiEnvelope<AccountingExpense[]>>("/accounting/expenses", {
    params,
  });
  return data.data;
}

export async function createExpense(payload: CreateExpensePayload): Promise<AccountingExpense> {
  const { data } = await apiClient.post<ApiEnvelope<AccountingExpense>>(
    "/accounting/expenses",
    payload,
  );
  return data.data;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await apiClient.delete(`/accounting/expenses/${expenseId}`);
}

export async function requestExpenseDelete(expenseId: string): Promise<AccountingExpense> {
  const { data } = await apiClient.post<ApiEnvelope<AccountingExpense>>(
    `/accounting/expenses/${expenseId}/delete-request`,
  );
  return data.data;
}

export async function cancelExpenseDeleteRequest(expenseId: string): Promise<AccountingExpense> {
  const { data } = await apiClient.post<ApiEnvelope<AccountingExpense>>(
    `/accounting/expenses/${expenseId}/delete-request/cancel`,
  );
  return data.data;
}

export async function fetchBudget(year: number, month: number): Promise<BudgetPeriod> {
  const { data } = await apiClient.get<ApiEnvelope<BudgetPeriod>>("/accounting/budgets", {
    params: { year, month },
  });
  return data.data;
}

export async function upsertBudget(payload: UpsertBudgetPayload): Promise<BudgetPeriod> {
  const { data } = await apiClient.put<ApiEnvelope<BudgetPeriod>>("/accounting/budgets", payload);
  return data.data;
}

export async function fetchDayCloses(): Promise<DayCloseRecord[]> {
  const { data } = await apiClient.get<ApiEnvelope<DayCloseRecord[]>>("/accounting/day-closes");
  return data.data;
}

export async function fetchDayCloseSnapshot(date: string): Promise<DayCloseSnapshot> {
  const { data } = await apiClient.get<ApiEnvelope<DayCloseSnapshot>>(
    `/accounting/day-closes/${date}`,
  );
  return data.data;
}

export async function createDayClose(payload: CreateDayClosePayload): Promise<DayCloseRecord> {
  const { data } = await apiClient.post<ApiEnvelope<DayCloseRecord>>(
    "/accounting/day-closes",
    payload,
  );
  return data.data;
}
