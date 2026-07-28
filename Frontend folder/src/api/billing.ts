import { apiClient } from "../lib/axios";

export type PaymentMethod = "cash" | "card" | "upi" | "wallet";

export interface BillingLineItem {
  lineType: "service" | "product" | "package";
  serviceId?: string;
  productId?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineDiscount?: number;
}

export interface BillingCheckoutBase {
  customerId?: string;
  appointmentId?: string;
  customerName: string;
  customerPhone: string;
  source: "appointment" | "walk-in" | "pos";
  items: BillingLineItem[];
  subtotal: number;
  discountAmount?: number;
  membershipDiscount?: number;
  couponDiscount?: number;
  /** Staff manual discount — requires manualDiscountReason when > 0 */
  manualDiscountAmount?: number;
  manualDiscountReason?: string;
  gstRate?: number;
  gstAmount?: number;
  totalAmount: number;
  notes?: string;
  dueDate?: string;
}

export interface BillingPaymentInput {
  paymentMethod: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface InvoiceResponse {
  id: string;
  receiptNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string | null;
  customer?: string;
  customerName?: string;
  phone?: string;
  customerPhone?: string;
  services?: string[];
  receiptNo?: string;
  date?: string;
  time?: string;
  subtotal?: number;
  discount?: number;
  gst?: number;
  total?: number;
  paymentMethod?: "cash" | "card" | "upi" | "wallet" | "none";
  source?: string;
  appointmentId?: string | null;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function confirmOnlyCheckout(payload: BillingCheckoutBase): Promise<InvoiceResponse> {
  const { data } = await apiClient.post<ApiEnvelope<InvoiceResponse>>("/billing/confirm-only", payload);
  return data.data;
}

export async function completeCheckout(
  payload: BillingCheckoutBase & { payments: BillingPaymentInput[]; loyaltyPointsEarned?: number },
): Promise<InvoiceResponse> {
  const { data } = await apiClient.post<ApiEnvelope<InvoiceResponse>>("/billing/checkout", payload);
  return data.data;
}

export async function fetchPendingPayments(): Promise<InvoiceResponse[]> {
  const { data } = await apiClient.get<ApiEnvelope<InvoiceResponse[]>>("/billing/pending");
  return data.data;
}

export async function fetchInvoices(): Promise<InvoiceResponse[]> {
  const { data } = await apiClient.get<ApiEnvelope<InvoiceResponse[]>>("/billing/invoices");
  return data.data;
}

export async function collectInvoicePayment(
  invoiceId: string,
  payload: { amount: number; paymentMethod: PaymentMethod; reference?: string },
): Promise<InvoiceResponse> {
  const { data } = await apiClient.post<ApiEnvelope<InvoiceResponse>>(
    `/billing/${invoiceId}/collect`,
    payload,
  );
  return data.data;
}

export interface RefundInvoice extends InvoiceResponse {
  customerName?: string;
  customerPhone?: string;
  voidedAt?: string | null;
  refundStatus?: "pending" | "approved";
  refundReason?: string;
  refundAmount?: number;
  approvedBy?: string | null;
  requestedAt?: string | null;
}

export async function fetchRefunds(): Promise<RefundInvoice[]> {
  const { data } = await apiClient.get<ApiEnvelope<RefundInvoice[]>>("/billing/refunds");
  return data.data;
}

export async function requestRefund(
  invoiceId: string,
  payload: { reason: string },
): Promise<RefundInvoice> {
  const { data } = await apiClient.post<ApiEnvelope<RefundInvoice>>(
    `/billing/${invoiceId}/refund/request`,
    payload,
  );
  return data.data;
}

export async function approveRefund(
  invoiceId: string,
  payload: { pin: string },
): Promise<RefundInvoice> {
  const { data } = await apiClient.post<ApiEnvelope<RefundInvoice>>(
    `/billing/${invoiceId}/refund/approve`,
    payload,
  );
  return data.data;
}

export async function rejectRefund(invoiceId: string): Promise<InvoiceResponse> {
  const { data } = await apiClient.post<ApiEnvelope<InvoiceResponse>>(
    `/billing/${invoiceId}/refund/reject`,
  );
  return data.data;
}
