export interface RefundRecord {
  id: string; invoiceId: string; customer: string; phone: string;
  amount: number; reason: string; approvedBy: string; mode: string;
  date: string; status: "approved" | "pending";
  txType: "REFUND";
}
export interface PendingRecord {
  id: string; invoiceId: string; customer: string; phone: string;
  due: number; total: number; dueDate: string; services: string[];
  partialPaid: number; status: "PARTIAL" | "UNPAID";
  txType: "REVENUE";
}
