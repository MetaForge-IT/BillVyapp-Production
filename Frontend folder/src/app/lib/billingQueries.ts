import { fetchInvoices, fetchPendingPayments, type InvoiceResponse } from "../../api/billing";
import { LIST_WORKING_LIMIT } from "../../lib/pagination";
import { istDateKey } from "../../lib/istDate";
import type { ReceiptLineItem } from "./receiptLineItems";

export type { ReceiptLineItem };

export type PaymentStatus = "paid" | "pending" | "partially_paid";

export interface ReceiptRecord {
  id: string;
  receiptNo: string;
  date: string;
  time: string;
  customer: string;
  phone: string;
  services: string[];
  lineItems: ReceiptLineItem[];
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: "cash" | "card" | "upi" | "wallet" | "none";
  source: "pos" | "appointment" | "walk-in";
  dueDate?: string;
  appointmentId?: string;
}

export type PendingPaymentStatus = "UNPAID" | "PARTIAL";

export interface PendingPayment {
  id: string;
  invoiceId: string;
  customer: string;
  phone: string;
  due: number;
  total: number;
  paidAmount: number;
  dueDate: string;
  services: string[];
  status: PendingPaymentStatus;
  appointmentId?: string;
  createdAt: string;
}

function mapPaymentStatus(status: string): PaymentStatus {
  if (status === "paid") return "paid";
  if (status === "partially_paid") return "partially_paid";
  return "pending";
}

function mapSource(source?: string): ReceiptRecord["source"] {
  if (source === "walk-in" || source === "walk_in") return "walk-in";
  if (source === "pos") return "pos";
  return "appointment";
}

export function mapInvoiceToReceipt(inv: InvoiceResponse): ReceiptRecord {
  const lineItems: ReceiptLineItem[] =
    inv.lineItems ??
    inv.items?.map((item) => ({
      name: item.itemName,
      amount: item.lineTotal,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })) ??
    [];

  return {
    id: inv.id,
    receiptNo: inv.receiptNo ?? inv.receiptNumber,
    date: inv.date ?? "",
    time: inv.time ?? "",
    customer: inv.customer ?? "",
    phone: inv.phone ?? "",
    services: inv.services ?? lineItems.map((line) => line.name),
    lineItems,
    subtotal: inv.subtotal ?? 0,
    discount: inv.discount ?? 0,
    gst: inv.gst ?? 0,
    total: inv.total ?? inv.totalAmount,
    paidAmount: inv.paidAmount,
    balanceAmount: inv.balanceAmount,
    paymentStatus: mapPaymentStatus(inv.paymentStatus ?? inv.status),
    paymentMethod: inv.paymentMethod ?? "none",
    source: mapSource(inv.source),
    dueDate: inv.dueDate ?? undefined,
    appointmentId: inv.appointmentId ?? undefined,
  };
}

export function mapInvoiceToPending(inv: InvoiceResponse): PendingPayment {
  return {
    id: inv.id,
    invoiceId: inv.receiptNumber,
    customer: inv.customer ?? inv.customerName ?? "",
    phone: inv.phone ?? inv.customerPhone ?? "",
    due: inv.balanceAmount,
    total: inv.totalAmount,
    paidAmount: inv.paidAmount,
    dueDate: inv.dueDate ?? istDateKey(),
    services: inv.services ?? [],
    status: inv.paidAmount > 0 ? "PARTIAL" : "UNPAID",
    appointmentId: inv.appointmentId ?? undefined,
    createdAt: inv.date ?? istDateKey(),
  };
}

export async function fetchReceiptRecords(params?: {
  page?: number;
  limit?: number;
  search?: string;
  salonId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
}) {
  const result = await fetchInvoices({
    page: params?.page ?? 1,
    limit: params?.limit ?? LIST_WORKING_LIMIT,
    search: params?.search,
    salonId: params?.salonId,
    date: params?.date,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    paymentMethod: params?.paymentMethod,
  });
  return {
    ...result,
    items: result.items.map(mapInvoiceToReceipt),
  };
}

export async function fetchPendingPaymentRecords(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const result = await fetchPendingPayments({
    page: params?.page ?? 1,
    limit: params?.limit ?? LIST_WORKING_LIMIT,
    search: params?.search,
  });
  return {
    ...result,
    items: result.items.map(mapInvoiceToPending),
  };
}
