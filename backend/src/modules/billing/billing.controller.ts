import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { billingService } from "./billing.service";
import type { CheckoutInput, CollectPaymentInput, ConfirmOnlyInput, ApproveRefundInput, RequestRefundInput } from "./billing.validators";
import { invoicesSummaryQuerySchema, listBillingQuerySchema } from "./billing.validators";

export class BillingController {
  confirmOnly = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as ConfirmOnlyInput;
    const invoice = await billingService.confirmOnly(auth, body);

    sendCreated(res, {
      message: "Appointment confirmed without payment",
      data: invoice,
    });
  });

  checkout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CheckoutInput;
    const invoice = await billingService.checkout(auth, body);

    sendCreated(res, {
      message: "Payment completed successfully",
      data: invoice,
    });
  });

  listPending = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const query = listBillingQuerySchema.parse(req.query);
    const invoices = await billingService.listPending(auth, query);

    sendSuccess(res, {
      message: "Pending payments retrieved",
      data: invoices,
    });
  });

  collectPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CollectPaymentInput;
    const invoiceId = String(req.params.invoiceId ?? "");
    const invoice = await billingService.collectPayment(auth, invoiceId, body);

    sendSuccess(res, {
      message: "Payment collected successfully",
      data: invoice,
    });
  });

  listInvoices = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const query = listBillingQuerySchema.parse(req.query);
    const invoices = await billingService.listInvoices(auth, query);

    sendSuccess(res, {
      message: "Invoices retrieved",
      data: invoices,
    });
  });

  getInvoicesSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const query = invoicesSummaryQuerySchema.parse(req.query);
    const summary = await billingService.getInvoicesSummary(auth, query);

    sendSuccess(res, {
      message: "Invoice summary retrieved",
      data: summary,
    });
  });

  listRefunds = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const refunds = await billingService.listRefunds(auth);

    sendSuccess(res, {
      message: "Refunds retrieved",
      data: refunds,
    });
  });

  requestRefund = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as RequestRefundInput;
    const invoiceId = String(req.params.invoiceId ?? "");
    const refund = await billingService.requestRefund(auth, invoiceId, body);

    sendSuccess(res, {
      message: "Refund request submitted for manager approval",
      data: refund,
    });
  });

  approveRefund = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as ApproveRefundInput;
    const invoiceId = String(req.params.invoiceId ?? "");
    const refund = await billingService.approveRefund(auth, invoiceId, body.pin);

    sendSuccess(res, {
      message: "Refund approved successfully",
      data: refund,
    });
  });

  rejectRefund = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const invoiceId = String(req.params.invoiceId ?? "");
    const invoice = await billingService.rejectRefund(auth, invoiceId);

    sendSuccess(res, {
      message: "Refund request rejected",
      data: invoice,
    });
  });
}

export const billingController = new BillingController();
