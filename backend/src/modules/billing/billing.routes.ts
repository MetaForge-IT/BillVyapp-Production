import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate, authorize } from "../auth/auth.middleware";
import { billingController } from "./billing.controller";
import { REFUND_APPROVAL_ROLES } from "./billing.constants";
import {
  approveRefundSchema,
  checkoutSchema,
  collectPaymentSchema,
  confirmOnlySchema,
  requestRefundSchema,
} from "./billing.validators";

const billingRouter = Router();

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

billingRouter.use(authenticate);

billingRouter.post("/confirm-only", validateRequest(confirmOnlySchema), billingController.confirmOnly);
billingRouter.post("/checkout", validateRequest(checkoutSchema), billingController.checkout);
billingRouter.get("/invoices", billingController.listInvoices);
billingRouter.get("/refunds", billingController.listRefunds);
billingRouter.get("/pending", billingController.listPending);
billingRouter.post("/:invoiceId/refund/request", validateRequest(requestRefundSchema), billingController.requestRefund);
billingRouter.post(
  "/:invoiceId/refund/approve",
  authorize(...REFUND_APPROVAL_ROLES),
  validateRequest(approveRefundSchema),
  billingController.approveRefund,
);
billingRouter.post(
  "/:invoiceId/refund/reject",
  authorize(...REFUND_APPROVAL_ROLES),
  billingController.rejectRefund,
);
billingRouter.post("/:invoiceId/collect", validateRequest(collectPaymentSchema), billingController.collectPayment);

export { billingRouter };
