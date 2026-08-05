import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate, authorize } from "../auth/auth.middleware";
import {
  DAY_CLOSE_ROLES,
  EXPENSE_DELETE_APPROVER_ROLES,
  EXPENSE_DELETE_REQUESTOR_ROLES,
} from "./accounting.constants";
import { accountingController } from "./accounting.controller";
import {
  createDayCloseSchema,
  createExpenseSchema,
  updateExpenseSchema,
  upsertBudgetSchema,
} from "./accounting.validators";

const accountingRouter = Router();

function validateRequest(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: issue.path.length > 0 ? issue.path.join(".") : "body",
          message: issue.message,
        }));
        next(new BadRequestError("Validation failed", errors));
        return;
      }
      next(error);
    }
  };
}

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
