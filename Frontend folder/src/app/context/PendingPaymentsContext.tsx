import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collectInvoicePayment } from "../../api/billing";
import { getApiErrorMessage } from "../../lib/api";
import { LIST_WORKING_LIMIT } from "../../lib/pagination";
import { useAuthStore } from "../../stores/authStore";
import {
  fetchPendingPaymentRecords,
  mapInvoiceToPending,
  type PendingPayment,
  type PendingPaymentStatus,
} from "../lib/billingQueries";
import { queryKeys } from "../lib/queryKeys";

export type { PendingPayment, PendingPaymentStatus };

interface PendingPaymentsContextType {
  pendingPayments: PendingPayment[];
  total: number;
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

const workingParams = { page: 1, limit: LIST_WORKING_LIMIT };

export function PendingPaymentsProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.billing.pending(workingParams),
    queryFn: () => fetchPendingPaymentRecords(workingParams),
    enabled: Boolean(accessToken),
  });

  const pendingPayments = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const loading = query.isLoading || (query.isFetching && !query.data);
  const error = query.error
    ? getApiErrorMessage(query.error, "Failed to load pending payments")
    : null;

  const refresh = useCallback(async () => {
    if (!useAuthStore.getState().accessToken) {
      queryClient.setQueryData(queryKeys.billing.pending(workingParams), {
        items: [],
        page: 1,
        limit: LIST_WORKING_LIMIT,
        total: 0,
        totalPages: 1,
      });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["billing", "pending"] });
  }, [queryClient]);

  const addPendingPayment = useCallback(
    (payment: Omit<PendingPayment, "id">): PendingPayment => {
      const created: PendingPayment = { ...payment, id: String(Date.now()) };
      queryClient.setQueryData(queryKeys.billing.pending(workingParams), (prev: typeof query.data) => {
        const current = prev ?? {
          items: [] as PendingPayment[],
          page: 1,
          limit: LIST_WORKING_LIMIT,
          total: 0,
          totalPages: 1,
        };
        const items = [created, ...current.items];
        return { ...current, items, total: current.total + 1 };
      });
      return created;
    },
    [queryClient],
  );

  const collectPayment = useCallback(
    async (
      id: string,
      amount: number,
      paymentMethod: "cash" | "card" | "upi" | "wallet",
      reference?: string,
      payments?: Array<{
        paymentMethod: "cash" | "card" | "upi" | "wallet";
        amount: number;
        reference?: string;
      }>,
    ): Promise<PendingPayment | null> => {
      try {
        const updated = await collectInvoicePayment(
          id,
          payments && payments.length > 0
            ? { payments }
            : { amount, paymentMethod, reference },
        );
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["billing", "pending"] }),
          queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] }),
        ]);
        return mapInvoiceToPending(updated);
      } catch (err) {
        throw new Error(getApiErrorMessage(err, "Failed to collect payment"));
      }
    },
    [queryClient],
  );

  const removePendingPayment = useCallback(
    (id: string) => {
      queryClient.setQueryData(queryKeys.billing.pending(workingParams), (prev: typeof query.data) => {
        if (!prev) return prev;
        const items = prev.items.filter((p) => p.id !== id);
        return { ...prev, items, total: Math.max(0, prev.total - 1) };
      });
    },
    [queryClient],
  );

  const value = useMemo(
    () => ({
      pendingPayments,
      total,
      loading,
      error,
      refresh,
      addPendingPayment,
      collectPayment,
      removePendingPayment,
    }),
    [
      pendingPayments,
      total,
      loading,
      error,
      refresh,
      addPendingPayment,
      collectPayment,
      removePendingPayment,
    ],
  );

  return (
    <PendingPaymentsContext.Provider value={value}>
      {children}
    </PendingPaymentsContext.Provider>
  );
}

export function usePendingPayments() {
  const ctx = useContext(PendingPaymentsContext);
  if (!ctx) throw new Error("usePendingPayments must be used within PendingPaymentsProvider");
  return ctx;
}
