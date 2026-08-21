import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createAdvance as apiCreateAdvance,
  deductAdvance as apiDeductAdvance,
  fetchAdvances,
  type AdvanceRecord,
  type CreateAdvancePayload,
} from "../../api/advances";
import { getApiErrorMessage } from "../../lib/api";
import { toast } from "../components/ui/hot-toast";

export type { AdvanceRecord };

interface AdvancesContextType {
  advances: AdvanceRecord[];
  loading: boolean;
  refreshAdvances: () => Promise<void>;
  addAdvance: (payload: {
    customer: string;
    phone: string;
    service?: string;
    amount: number;
    bookedFor?: string;
    source?: string;
    customerId?: string;
  }) => Promise<AdvanceRecord | null>;
  getActiveAdvancesForPhone: (phone: string) => AdvanceRecord[];
  deductAdvance: (id: string, amount: number) => Promise<void>;
}

const AdvancesContext = createContext<AdvancesContextType | null>(null);

export function AdvancesProvider({ children }: { children: ReactNode }) {
  const [advances, setAdvances] = useState<AdvanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAdvances = useCallback(async () => {
    try {
      setAdvances(await fetchAdvances());
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load advances"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAdvances();
  }, [refreshAdvances]);

  const addAdvance = useCallback(async (payload: {
    customer: string;
    phone: string;
    service?: string;
    amount: number;
    bookedFor?: string;
    source?: string;
    customerId?: string;
  }): Promise<AdvanceRecord | null> => {
    const body: CreateAdvancePayload = {
      customerName: payload.customer,
      phone: payload.phone,
      service: payload.service,
      amount: payload.amount,
      bookedFor: payload.bookedFor,
      source: payload.source ?? "manual",
      customerId: payload.customerId,
    };
    try {
      const created = await apiCreateAdvance(body);
      setAdvances((prev) => [created, ...prev]);
      return created;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to record advance"));
      return null;
    }
  }, []);

  const getActiveAdvancesForPhone = useCallback((phone: string) => {
    const normalized = phone.replace(/\D/g, "").slice(-10);
    return advances.filter(
      (advance) =>
        advance.phone.replace(/\D/g, "").slice(-10) === normalized && advance.balance > 0,
    );
  }, [advances]);

  const deductAdvance = useCallback(async (id: string, amount: number) => {
    try {
      const updated = await apiDeductAdvance(id, amount);
      setAdvances((prev) => prev.map((advance) => (advance.id === id ? updated : advance)));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to apply advance"));
    }
  }, []);

  const value = useMemo(
    () => ({
      advances,
      loading,
      refreshAdvances,
      addAdvance,
      getActiveAdvancesForPhone,
      deductAdvance,
    }),
    [advances, loading, refreshAdvances, addAdvance, getActiveAdvancesForPhone, deductAdvance],
  );

  return (
    <AdvancesContext.Provider value={value}>
      {children}
    </AdvancesContext.Provider>
  );
}

export function useAdvances() {
  const ctx = useContext(AdvancesContext);
  if (!ctx) throw new Error("useAdvances must be used within AdvancesProvider");
  return ctx;
}
