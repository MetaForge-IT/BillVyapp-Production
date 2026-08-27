import { ForbiddenError } from "../../utils/errors";
import type { AuthContext } from "../auth/auth.types";
import {
  EXPENSE_DELETE_APPROVER_ROLES,
  EXPENSE_DELETE_REQUESTOR_ROLES,
} from "./accounting.constants";
import { accountingRepository } from "./accounting.repository";
import type {
  CreateDayCloseInput,
  CreateExpenseInput,
  ListExpensesQuery,
  UpdateExpenseInput,
  UpsertBudgetInput,
} from "./accounting.validators";

const APPROVER_ROLES = new Set<string>(EXPENSE_DELETE_APPROVER_ROLES);
const REQUESTOR_ROLES = new Set<string>(EXPENSE_DELETE_REQUESTOR_ROLES);

export class AccountingService {
  listExpenses(auth: AuthContext, filters: ListExpensesQuery) {
    return accountingRepository.listExpenses(auth, filters);
  }

  createExpense(auth: AuthContext, input: CreateExpenseInput) {
    return accountingRepository.createExpense(auth, input);
  }

  updateExpense(auth: AuthContext, expenseId: string, input: UpdateExpenseInput) {
    if (!APPROVER_ROLES.has(auth.role)) {
      throw new ForbiddenError("Only admin can edit expenses");
    }
    return accountingRepository.updateExpense(auth, expenseId, input);
  }

  requestExpenseDelete(auth: AuthContext, expenseId: string) {
    if (!REQUESTOR_ROLES.has(auth.role) && !APPROVER_ROLES.has(auth.role)) {
      throw new ForbiddenError("You cannot request expense deletion");
    }
    // Admins should hard-delete; keep request path for managers primarily.
    return accountingRepository.requestExpenseDelete(auth, expenseId);
  }

  cancelExpenseDeleteRequest(auth: AuthContext, expenseId: string) {
    if (!APPROVER_ROLES.has(auth.role)) {
      throw new ForbiddenError("Only admin can cancel expense delete requests");
    }
    return accountingRepository.cancelExpenseDeleteRequest(auth, expenseId);
  }

  deleteExpense(auth: AuthContext, expenseId: string) {
    if (!APPROVER_ROLES.has(auth.role)) {
      throw new ForbiddenError("Only admin can delete expenses");
    }
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

  getOverview(auth: AuthContext, opts?: { date?: string; salonId?: string }) {
    return accountingRepository.getOverview(auth, opts);
  }
}

export const accountingService = new AccountingService();
