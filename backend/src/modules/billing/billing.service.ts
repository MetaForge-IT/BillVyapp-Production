import type { AuthContext } from "../auth/auth.types";
import { billingRepository } from "./billing.repository";
import type { CheckoutInput, CollectPaymentInput, ConfirmOnlyInput, ListBillingQuery, RequestRefundInput } from "./billing.validators";

export class BillingService {
  confirmOnly(auth: AuthContext, input: ConfirmOnlyInput) {
    return billingRepository.confirmOnly(auth, input);
  }

  checkout(auth: AuthContext, input: CheckoutInput) {
    return billingRepository.checkout(auth, input);
  }

  listPending(auth: AuthContext, query: ListBillingQuery) {
    return billingRepository.listPending(auth, query);
  }

  collectPayment(auth: AuthContext, invoiceId: string, input: CollectPaymentInput) {
    return billingRepository.collectPayment(auth, invoiceId, input);
  }

  listInvoices(auth: AuthContext, query: ListBillingQuery) {
    return billingRepository.listInvoices(auth, query);
  }

  listRefunds(auth: AuthContext) {
    return billingRepository.listRefunds(auth);
  }

  requestRefund(auth: AuthContext, invoiceId: string, input: RequestRefundInput) {
    return billingRepository.requestRefund(auth, invoiceId, input);
  }

  approveRefund(auth: AuthContext, invoiceId: string, pin: string) {
    return billingRepository.approveRefund(auth, invoiceId, pin);
  }

  rejectRefund(auth: AuthContext, invoiceId: string) {
    return billingRepository.rejectRefund(auth, invoiceId);
  }
}

export const billingService = new BillingService();
