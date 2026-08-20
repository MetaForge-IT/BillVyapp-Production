import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { collectInvoicePayment, fetchPendingPayments } from "../../api/billing";
import { getApiErrorMessage } from "../../lib/api";
import { authService } from "../../services/authService";

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

interface PendingPaymentsContextType {
  pendingPayments: PendingPayment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addPendingPayment: (payment: Omit<PendingPayment, "id">) => PendingPayment;
  collectPayment: (
    id: string,
    amount: number,
    paymentMethod: "cash" | "card" | "upi" | "wallet",
    reference?: string,
    payments?: Array<{
      paymentMethod: "cash" | "card" | "upi" | "wallet";
      amount: number;
      reference?: string;
    }>,
  ) => Promise<PendingPayment | null>;
  removePendingPayment: (id: string) => void;
}

const PendingPaymentsContext = createContext<PendingPaymentsContextType | null>(null);

export function PendingPaymentsProvider({ children }: { children: ReactNode }) {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setPendingPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const invoices = await fetchPendingPayments();
      setPendingPayments(
        invoices.map((inv) => ({
          id: inv.id,
          invoiceId: inv.receiptNumber,
          customer: inv.customer ?? inv.customerName ?? "",
          phone: inv.phone ?? inv.customerPhone ?? "",
          due: inv.balanceAmount,
          total: inv.totalAmount,
          paidAmount: inv.paidAmount,
          dueDate: inv.dueDate ?? new Date().toISOString().slice(0, 10),
          services: inv.services ?? [],
          status: inv.paidAmount > 0 ? "PARTIAL" : "UNPAID",
          appointmentId: inv.appointmentId ?? undefined,
          createdAt: inv.date ?? new Date().toISOString().slice(0, 10),
        })),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load pending payments"));
      setPendingPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function addPendingPayment(payment: Omit<PendingPayment, "id">): PendingPayment {
    const created: PendingPayment = { ...payment, id: String(Date.now()) };
    setPendingPayments((prev) => [created, ...prev]);
    return created;
  }

  async function collectPayment(
    id: string,
    amount: number,
    paymentMethod: "cash" | "card" | "upi" | "wallet",
    reference?: string,
    payments?: Array<{
      paymentMethod: "cash" | "card" | "upi" | "wallet";
      amount: number;
      reference?: string;
    }>,
  ): Promise<PendingPayment | null> {
    try {
      const updated = await collectInvoicePayment(
        id,
        payments && payments.length > 0
          ? { payments }
          : { amount, paymentMethod, reference },
      );
      await refresh();
      return {
        id: updated.id,
        invoiceId: updated.receiptNumber,
        customer: updated.customer ?? updated.customerName ?? "",
        phone: updated.phone ?? updated.customerPhone ?? "",
        due: updated.balanceAmount,
        total: updated.totalAmount,
        paidAmount: updated.paidAmount,
        dueDate: updated.dueDate ?? new Date().toISOString().slice(0, 10),
        services: updated.services ?? [],
        status: updated.paidAmount > 0 && updated.balanceAmount > 0 ? "PARTIAL" : "UNPAID",
        createdAt: updated.date ?? new Date().toISOString().slice(0, 10),
      };
    } catch (err) {
      throw new Error(getApiErrorMessage(err, "Failed to collect payment"));
    }
  }

  function removePendingPayment(id: string) {
    setPendingPayments((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <PendingPaymentsContext.Provider
      value={{
        pendingPayments,
        loading,
        error,
        refresh,
        addPendingPayment,
        collectPayment,
        removePendingPayment,
      }}
    >
      {children}
    </PendingPaymentsContext.Provider>
  );
}

export function usePendingPayments() {
  const ctx = useContext(PendingPaymentsContext);
  if (!ctx) throw new Error("usePendingPayments must be used within PendingPaymentsProvider");
  return ctx;
}
