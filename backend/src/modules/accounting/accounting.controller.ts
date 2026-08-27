import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { accountingService } from "./accounting.service";
import {
  accountingOverviewQuerySchema,
  listExpensesQuerySchema,
  type CreateDayCloseInput,
  type CreateExpenseInput,
  type UpdateExpenseInput,
  type UpsertBudgetInput,
} from "./accounting.validators";

function parseIntParam(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export class AccountingController {
  listExpenses = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const query = listExpensesQuerySchema.parse(req.query);
    const expenses = await accountingService.listExpenses(auth, query);
    sendSuccess(res, { message: "Expenses retrieved", data: expenses });
  });

  createExpense = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const expense = await accountingService.createExpense(auth, req.body as CreateExpenseInput);
    sendCreated(res, { message: "Expense created", data: expense });
  });

  updateExpense = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const expense = await accountingService.updateExpense(
      auth,
      String(req.params.expenseId),
      req.body as UpdateExpenseInput,
    );
    sendSuccess(res, { message: "Expense updated", data: expense });
  });

  requestExpenseDelete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const expense = await accountingService.requestExpenseDelete(
      auth,
      String(req.params.expenseId),
    );
    sendSuccess(res, { message: "Delete requested; waiting for admin approval", data: expense });
  });

  cancelExpenseDeleteRequest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const expense = await accountingService.cancelExpenseDeleteRequest(
      auth,
      String(req.params.expenseId),
    );
    sendSuccess(res, { message: "Delete request rejected", data: expense });
  });

  deleteExpense = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await accountingService.deleteExpense(auth, String(req.params.expenseId));
    sendNoContent(res);
  });

  getBudget = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const now = new Date();
    const year = parseIntParam(req.query.year, now.getFullYear());
    const month = parseIntParam(req.query.month, now.getMonth() + 1);
    const budget = await accountingService.getBudget(auth, year, month);
    sendSuccess(res, { message: "Budget retrieved", data: budget });
  });

  upsertBudget = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const budget = await accountingService.upsertBudget(auth, req.body as UpsertBudgetInput);
    sendSuccess(res, { message: "Budget saved", data: budget });
  });

  listDayCloses = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const rows = await accountingService.listDayCloses(auth);
    sendSuccess(res, { message: "Day closes retrieved", data: rows });
  });

  getDayClose = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const snapshot = await accountingService.getDayClose(auth, String(req.params.date));
    sendSuccess(res, { message: "Day close snapshot retrieved", data: snapshot });
  });

  createDayClose = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const row = await accountingService.createDayClose(auth, req.body as CreateDayCloseInput);
    sendCreated(res, { message: "Day closed", data: row });
  });

  getOverview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const query = accountingOverviewQuerySchema.parse(req.query);
    const overview = await accountingService.getOverview(auth, query);
    sendSuccess(res, { message: "Accounting overview retrieved", data: overview });
  });
}

export const accountingController = new AccountingController();
