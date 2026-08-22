import type { AuthContext } from "../auth/auth.types";
import { invalidateDashboardCache } from "../dashboard/invalidateDashboardCache";
import { billingRepository } from "./billing.repository";
import type {
  CheckoutInput,
  CollectPaymentInput,
  ConfirmOnlyInput,
  ListBillingQuery,
  RequestRefundInput,
} from "./billing.validators";

export class BillingService {
  async confirmOnly(auth: AuthContext, input: ConfirmOnlyInput) {
    const result = await billingRepository.confirmOnly(auth, input);
    invalidateDashboardCache(auth.salonId);
    return result;
  }

  async checkout(auth: AuthContext, input: CheckoutInput) {
    const result = await billingRepository.checkout(auth, input);
    invalidateDashboardCache(auth.salonId);
    return result;
  }

  listPending(auth: AuthContext, query: ListBillingQuery) {
    return billingRepository.listPending(auth, query);
  }

  async collectPayment(auth: AuthContext, invoiceId: string, input: CollectPaymentInput) {
    const result = await billingRepository.collectPayment(auth, invoiceId, input);
    invalidateDashboardCache(auth.salonId);
    return result;
  }

  listInvoices(auth: AuthContext, query: ListBillingQuery) {
    return billingRepository.listInvoices(auth, query);
  }

  getInvoicesSummary(auth: AuthContext) {
    return billingRepository.getInvoicesSummary(auth);
  }

  listRefunds(auth: AuthContext) {
    return billingRepository.listRefunds(auth);
  }

  async requestRefund(auth: AuthContext, invoiceId: string, input: RequestRefundInput) {
    const result = await billingRepository.requestRefund(auth, invoiceId, input);
    invalidateDashboardCache(auth.salonId);
    return result;
  }

  async approveRefund(auth: AuthContext, invoiceId: string, pin: string) {
    const result = await billingRepository.approveRefund(auth, invoiceId, pin);
    invalidateDashboardCache(auth.salonId);
    return result;
  }

  async rejectRefund(auth: AuthContext, invoiceId: string) {
    const result = await billingRepository.rejectRefund(auth, invoiceId);
    invalidateDashboardCache(auth.salonId);
    return result;
  }
}

export const billingService = new BillingService();
