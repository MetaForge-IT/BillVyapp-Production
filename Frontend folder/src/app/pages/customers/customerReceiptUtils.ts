import type { CustomerVisit } from "../../../api/customers";
import { downloadReceiptBill, type DownloadableReceipt } from "../../lib/downloadReceipt";
import { toIstDateKey } from "../../../lib/istDate";
import type { ReceiptShopInfo } from "../../components/shared/SalonReceiptBrand";
import type { ReceiptPreviewData } from "../../components/shared/ReceiptPreviewDialog";
import type { ReceiptLineItem } from "../../lib/receiptLineItems";

export type CustomerReceiptRow = {
  id: string;
  receiptNo: string;
  dateStr: string;
  dateKey: string;
  timeStr: string;
  amount: number;
  services: string[];
  lineItems: ReceiptLineItem[];
  paymentMethod?: string;
  subtotal: number;
  discount: number;
  gst: number;
  amountPaid: number;
  downloadable: DownloadableReceipt | null;
};

export function formatVisitDateTime(dateIso: string): { dateStr: string; timeStr: string; dateKey: string } {
  const visitDate = new Date(dateIso);
  const dateStr = visitDate.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = visitDate.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
  return { dateStr, timeStr, dateKey: toIstDateKey(visitDate) };
}

export function visitToReceiptRow(visit: CustomerVisit): CustomerReceiptRow | null {
  if (visit.type !== "invoice") return null;

  const receiptNo =
    typeof visit.meta.receiptNumber === "string" ? visit.meta.receiptNumber : null;
  if (!receiptNo) return null;

  const services = Array.isArray(visit.meta.services)
    ? (visit.meta.services as string[])
    : [];
  const lineItems = Array.isArray(visit.meta.lineItems)
    ? (visit.meta.lineItems as ReceiptLineItem[])
    : [];
  const paymentMethod =
    typeof visit.meta.paymentMethod === "string" ? visit.meta.paymentMethod : undefined;
  const membershipDiscount =
    typeof visit.meta.membershipDiscount === "number" ? visit.meta.membershipDiscount : 0;
  const amountPaid =
    typeof visit.meta.amountPaid === "number" ? visit.meta.amountPaid : visit.amount;
  const { dateStr, timeStr, dateKey } = formatVisitDateTime(visit.date);
  const subtotal = visit.amount + membershipDiscount;

  return {
    id: visit.id,
    receiptNo,
    dateStr,
    dateKey,
    timeStr,
    amount: visit.amount,
    services,
    lineItems,
    paymentMethod,
    subtotal,
    discount: membershipDiscount,
    gst: 0,
    amountPaid,
    downloadable: {
      receiptNo,
      date: dateKey,
      time: timeStr,
      customer: "",
      phone: "",
      services: services.length ? services : [visit.label],
      lineItems,
      subtotal,
      discount: membershipDiscount,
      gst: 0,
      total: visit.amount,
      paymentMethod,
    },
  };
}

export function rowToPreviewData(
  row: CustomerReceiptRow,
  customer: { name: string; phone: string },
): ReceiptPreviewData {
  return {
    id: row.id,
    receiptNo: row.receiptNo,
    date: row.dateKey,
    time: row.timeStr,
    customer: customer.name,
    phone: customer.phone,
    services: row.services.length ? row.services : ["Services"],
    lineItems: row.lineItems,
    subtotal: row.subtotal,
    discount: row.discount,
    gst: row.gst,
    total: row.amount,
    paymentMethod: row.paymentMethod,
    canRequestRefund: Boolean(row.paymentMethod && row.paymentMethod !== "none" && row.amountPaid > 0),
  };
}

export function downloadCustomerReceipt(
  receipt: DownloadableReceipt,
  customer: { name: string; phone: string },
  shopInfo: ReceiptShopInfo,
): boolean {
  return downloadReceiptBill(
    {
      ...receipt,
      customer: customer.name,
      phone: customer.phone,
    },
    shopInfo,
  );
}
