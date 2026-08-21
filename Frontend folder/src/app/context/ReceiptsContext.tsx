import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "../../lib/api";
import { LIST_WORKING_LIMIT } from "../../lib/pagination";
import { useAuthStore } from "../../stores/authStore";
import {
  fetchReceiptRecords,
  type PaymentStatus,
  type ReceiptRecord,
} from "../lib/billingQueries";
import { queryKeys } from "../lib/queryKeys";

export type { PaymentStatus, ReceiptRecord };

interface ReceiptsContextType {
  receipts: ReceiptRecord[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addReceipt: (r: Omit<ReceiptRecord, "id" | "receiptNo"> & { receiptNo?: string }) => ReceiptRecord;
  updateReceipt: (id: string, patch: Partial<ReceiptRecord>) => void;
}

const ReceiptsContext = createContext<ReceiptsContextType | null>(null);

const workingParams = { page: 1, limit: LIST_WORKING_LIMIT };

export function ReceiptsProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.billing.invoices(workingParams),
    queryFn: () => fetchReceiptRecords(workingParams),
    enabled: Boolean(accessToken),
  });

  const receipts = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const loading = query.isLoading || (query.isFetching && !query.data);
  const error = query.error
    ? getApiErrorMessage(query.error, "Failed to load receipts")
    : null;

  const refresh = useCallback(async () => {
    if (!useAuthStore.getState().accessToken) {
      queryClient.setQueryData(queryKeys.billing.invoices(workingParams), {
        items: [],
        page: 1,
        limit: LIST_WORKING_LIMIT,
        total: 0,
        totalPages: 1,
      });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] });
  }, [queryClient]);

  const addReceipt = useCallback(
    (r: Omit<ReceiptRecord, "id" | "receiptNo"> & { receiptNo?: string }): ReceiptRecord => {
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
    },
    [refresh],
  );

  const updateReceipt = useCallback(
    (id: string, patch: Partial<ReceiptRecord>) => {
      queryClient.setQueryData(queryKeys.billing.invoices(workingParams), (prev: typeof query.data) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        };
      });
    },
    [queryClient],
  );

  const value = useMemo(
    () => ({ receipts, total, loading, error, refresh, addReceipt, updateReceipt }),
    [receipts, total, loading, error, refresh, addReceipt, updateReceipt],
  );

  return (
    <ReceiptsContext.Provider value={value}>
      {children}
    </ReceiptsContext.Provider>
  );
}

export function useReceipts() {
  const ctx = useContext(ReceiptsContext);
  if (!ctx) throw new Error("useReceipts must be inside ReceiptsProvider");
  return ctx;
}
