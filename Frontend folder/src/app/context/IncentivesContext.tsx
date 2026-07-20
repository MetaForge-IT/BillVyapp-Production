import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchServiceCatalog } from "../../api/services";
import { buildInitialIncentiveSettings, normalizeServiceKey } from "../data/serviceIncentiveSeed";
import {
  DEFAULT_SERVICE_INCENTIVE,
  computeIncentiveAmount,
  type BillingIncentiveItem,
  type EarnedIncentive,
  type ServiceIncentiveSettings,
} from "../types/serviceIncentive";

function resolveSettingsKey(
  serviceName: string,
  settingsMap: Record<string, ServiceIncentiveSettings>,
): string | null {
  const key = normalizeServiceKey(serviceName);
  if (settingsMap[key]) return key;

  const lower = key;
  const partial = Object.keys(settingsMap).find(
    k => lower.includes(k) || k.includes(lower),
  );
  return partial ?? null;
}

type IncentivesContextValue = {
  serviceSettings: Record<string, ServiceIncentiveSettings>;
  earnedIncentives: EarnedIncentive[];
  getSettings: (serviceName: string) => ServiceIncentiveSettings;
  setSettings: (
    serviceName: string,
    settings: ServiceIncentiveSettings,
    previousName?: string,
  ) => void;
  calculateIncentive: (serviceName: string, lineTotal: number, qty: number) => number;
  recordBillingIncentives: (params: {
    customerName: string;
    receiptRef: string;
    items: BillingIncentiveItem[];
    defaultStaff?: string;
  }) => void;
};

const IncentivesContext = createContext<IncentivesContextValue | null>(null);

export function IncentivesProvider({ children }: { children: ReactNode }) {
  const [serviceSettings, setServiceSettings] = useState<Record<string, ServiceIncentiveSettings>>({});
  const [earnedIncentives, setEarnedIncentives] = useState<EarnedIncentive[]>([]);

  useEffect(() => {
    fetchServiceCatalog()
      .then((services) => {
        const names = services.map((service) => service.name);
        setServiceSettings((prev) => ({ ...buildInitialIncentiveSettings(names), ...prev }));
      })
      .catch(() => {
        // Incentive defaults remain empty when catalog cannot be loaded.
      });
  }, []);

  const getSettings = useCallback(
    (serviceName: string): ServiceIncentiveSettings => {
      const key = resolveSettingsKey(serviceName, serviceSettings);
      return key ? serviceSettings[key] : { ...DEFAULT_SERVICE_INCENTIVE };
    },
    [serviceSettings],
  );

  const setSettings = useCallback(
    (serviceName: string, settings: ServiceIncentiveSettings, previousName?: string) => {
      setServiceSettings(prev => {
        const next = { ...prev };
        if (previousName && previousName !== serviceName) {
          delete next[normalizeServiceKey(previousName)];
        }
        next[normalizeServiceKey(serviceName)] = { ...settings };
        return next;
      });
    },
    [],
  );

  const calculateIncentive = useCallback(
    (serviceName: string, lineTotal: number, qty: number) => {
      const settings = getSettings(serviceName);
      return computeIncentiveAmount(settings, lineTotal, qty);
    },
    [getSettings],
  );

  const recordBillingIncentives = useCallback(
    ({
      customerName,
      receiptRef,
      items,
      defaultStaff = "Stylist",
    }: {
      customerName: string;
      receiptRef: string;
      items: BillingIncentiveItem[];
      defaultStaff?: string;
    }) => {
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      const newRecords: EarnedIncentive[] = [];

      for (const item of items) {
        const lineTotal = item.rate * item.qty;
        const settings = getSettings(item.name);
        const incentiveAmount = computeIncentiveAmount(settings, lineTotal, item.qty);
        if (incentiveAmount <= 0) continue;

        newRecords.push({
          id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          employeeName: item.staff || defaultStaff,
          serviceName: item.name,
          customerName,
          serviceAmount: lineTotal,
          incentiveAmount,
          incentiveType: settings.type,
          incentiveValue: settings.value,
          receiptRef,
          date,
          time,
        });
      }

      if (newRecords.length > 0) {
        setEarnedIncentives(prev => [...newRecords, ...prev]);
      }
    },
    [getSettings],
  );

  const value = useMemo(
    () => ({
      serviceSettings,
      earnedIncentives,
      getSettings,
      setSettings,
      calculateIncentive,
      recordBillingIncentives,
    }),
    [serviceSettings, earnedIncentives, getSettings, setSettings, calculateIncentive, recordBillingIncentives],
  );

  return <IncentivesContext.Provider value={value}>{children}</IncentivesContext.Provider>;
}

export function useIncentives() {
  const ctx = useContext(IncentivesContext);
  if (!ctx) throw new Error("useIncentives must be used within IncentivesProvider");
  return ctx;
}
