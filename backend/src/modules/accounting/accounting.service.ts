import type { AuthContext } from "../auth/auth.types";
import { accountingRepository } from "./accounting.repository";
import type {
  CreateDayCloseInput,
  CreateExpenseInput,
  UpdateExpenseInput,
  UpsertBudgetInput,
} from "./accounting.validators";

export class AccountingService {
  listExpenses(auth: AuthContext, filters: { from?: string; to?: string; category?: string }) {
    return accountingRepository.listExpenses(auth.salonId, filters);
  }

  createExpense(auth: AuthContext, input: CreateExpenseInput) {
    return accountingRepository.createExpense(auth, input);
  }

  updateExpense(auth: AuthContext, expenseId: string, input: UpdateExpenseInput) {
    return accountingRepository.updateExpense(auth, expenseId, input);
  }

  deleteExpense(auth: AuthContext, expenseId: string) {
    return accountingRepository.deleteExpense(auth, expenseId);
  }

  getBudget(auth: AuthContext, year: number, month: number) {
    return accountingRepository.getBudget(auth.salonId, year, month);
  }

  upsertBudget(auth: AuthContext, input: UpsertBudgetInput) {
    return accountingRepository.upsertBudget(auth, input);
  }

  listDayCloses(auth: AuthContext) {
    return accountingRepository.listDayCloses(auth.salonId);
  }

  getDayClose(auth: AuthContext, date: string) {
    return accountingRepository.getDayClose(auth.salonId, date);
  }

  createDayClose(auth: AuthContext, input: CreateDayCloseInput) {
    return accountingRepository.createDayClose(auth, input);
  }

  getOverview(auth: AuthContext, date?: string) {
    return accountingRepository.getOverview(auth.salonId, date);
  }
}

export const accountingService = new AccountingService();
