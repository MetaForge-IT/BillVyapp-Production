import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchInvoices } from "../../api/billing";
import { getApiErrorMessage } from "../../lib/api";
import { authService } from "../../services/authService";

export type PaymentStatus = "paid" | "pending" | "partially_paid";

export interface ReceiptRecord {
  id: string;
  receiptNo: string;
  date: string;
  time: string;
  customer: string;
  phone: string;
  services: string[];
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

interface ReceiptsContextType {
  receipts: ReceiptRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addReceipt: (r: Omit<ReceiptRecord, "id" | "receiptNo"> & { receiptNo?: string }) => ReceiptRecord;
  updateReceipt: (id: string, patch: Partial<ReceiptRecord>) => void;
}

const ReceiptsContext = createContext<ReceiptsContextType | null>(null);

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

export function ReceiptsProvider({ children }: { children: ReactNode }) {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setReceipts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const invoices = await fetchInvoices();
      setReceipts(
        invoices.map((inv) => ({
          id: inv.id,
          receiptNo: inv.receiptNo ?? inv.receiptNumber,
          date: inv.date ?? "",
          time: inv.time ?? "",
          customer: inv.customer ?? "",
          phone: inv.phone ?? "",
          services: inv.services ?? [],
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
        })),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load receipts"));
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function addReceipt(
    r: Omit<ReceiptRecord, "id" | "receiptNo"> & { receiptNo?: string },
  ): ReceiptRecord {
    const newReceipt: ReceiptRecord = {
      ...r,
      id: String(Date.now()),
      receiptNo: r.receiptNo ?? `RCP-${Date.now()}`,
      paidAmount: r.paidAmount ?? r.total,
      balanceAmount: r.balanceAmount ?? 0,
      paymentStatus: r.paymentStatus ?? "paid",
      paymentMethod: r.paymentMethod ?? "cash",
    };
    void refresh();
    return newReceipt;
  }

  function updateReceipt(id: string, patch: Partial<ReceiptRecord>) {
    setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <ReceiptsContext.Provider value={{ receipts, loading, error, refresh, addReceipt, updateReceipt }}>
      {children}
    </ReceiptsContext.Provider>
  );
}

export function useReceipts() {
  const ctx = useContext(ReceiptsContext);
  if (!ctx) throw new Error("useReceipts must be inside ReceiptsProvider");
  return ctx;
}
