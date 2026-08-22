import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate, authorize } from "../auth/auth.middleware";
import {
  DAY_CLOSE_ROLES,
  EXPENSE_DELETE_APPROVER_ROLES,
  EXPENSE_DELETE_REQUESTOR_ROLES,
  EXPENSE_EDIT_ROLES,
} from "./accounting.constants";
import { accountingController } from "./accounting.controller";
import {
  createDayCloseSchema,
  createExpenseSchema,
  updateExpenseSchema,
  upsertBudgetSchema,
} from "./accounting.validators";

const accountingRouter = Router();

accountingRouter.use(authenticate);

accountingRouter.get("/overview", accountingController.getOverview);

accountingRouter.get("/expenses", accountingController.listExpenses);
accountingRouter.post(
  "/expenses",
  validateRequest(createExpenseSchema),
  accountingController.createExpense,
);
accountingRouter.patch(
  "/expenses/:expenseId",
  authorize(...EXPENSE_EDIT_ROLES),
  validateRequest(updateExpenseSchema),
  accountingController.updateExpense,
);
accountingRouter.post(
  "/expenses/:expenseId/delete-request",
  authorize(...EXPENSE_DELETE_REQUESTOR_ROLES, ...EXPENSE_DELETE_APPROVER_ROLES),
  accountingController.requestExpenseDelete,
);
accountingRouter.post(
  "/expenses/:expenseId/delete-request/cancel",
  authorize(...EXPENSE_DELETE_APPROVER_ROLES),
  accountingController.cancelExpenseDeleteRequest,
);
accountingRouter.delete(
  "/expenses/:expenseId",
  authorize(...EXPENSE_DELETE_APPROVER_ROLES),
  accountingController.deleteExpense,
);

accountingRouter.get("/budgets", accountingController.getBudget);
accountingRouter.put(
  "/budgets",
  validateRequest(upsertBudgetSchema),
  accountingController.upsertBudget,
);

accountingRouter.get("/day-closes", accountingController.listDayCloses);
accountingRouter.get("/day-closes/:date", accountingController.getDayClose);
accountingRouter.post(
  "/day-closes",
  authorize(...DAY_CLOSE_ROLES),
  validateRequest(createDayCloseSchema),
  accountingController.createDayClose,
);

export { accountingRouter };
