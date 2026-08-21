import type { PendingPayment } from "../../../context/PendingPaymentsContext";
import type { RefundInvoice } from "../../../../api/billing";
import { BRAND } from "../../../config/brand";
import { istDateKey, toIstDateKey } from "../../../../lib/istDate";
import type { RefundRecord } from "./types";

export const TODAY = istDateKey();
export const isOverdue = (d: string) => d < TODAY;
export const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function phoneForMessaging(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function hasValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 10;
}

export function defaultPaymentReminder(payment: PendingPayment): string {
  const overdue = isOverdue(payment.dueDate);
  return overdue
    ? `Hi ${payment.customer},\n\nYour payment of ${fmt(payment.due)} for invoice ${payment.invoiceId} at ${BRAND.clientName} was due on ${payment.dueDate}.\n\nPlease contact us to arrange payment at your earliest convenience.\n\nThank you.`
    : `Hi ${payment.customer},\n\nThis is a friendly reminder from ${BRAND.clientName}. Invoice ${payment.invoiceId} has an outstanding balance of ${fmt(payment.due)} (due ${payment.dueDate}).\n\nPlease visit us or reply to settle the amount.\n\nThank you.`;
}

export function mapRefundInvoice(invoice: RefundInvoice): RefundRecord {
  const pending = invoice.refundStatus === "pending";
  const primaryPayment = invoice.paymentMethod ?? "cash";
  return {
    id: invoice.id,
    invoiceId: invoice.receiptNumber || invoice.receiptNo || invoice.id,
    customer: invoice.customerName || invoice.customer || "Unknown",
    phone: invoice.customerPhone || invoice.phone || "",
    amount: invoice.refundAmount ?? invoice.paidAmount ?? invoice.totalAmount ?? invoice.total ?? 0,
    reason: invoice.refundReason || (pending ? "Awaiting reason" : "Refunded invoice"),
    approvedBy: invoice.approvedBy || (pending ? "" : "Manager"),
    mode: primaryPayment,
    date: toIstDateKey(invoice.voidedAt || invoice.requestedAt || invoice.date),
    status: pending ? "pending" : "approved",
    txType: "REFUND",
  };
}
