import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router";
import { fetchDashboard, type DashboardData } from "../../../api/dashboard";
import { fetchMyFranchise } from "../../../api/franchises";
import { getApiErrorMessage } from "../../../lib/api";
import { useAuthStore } from "../../../stores/authStore";
import { isAdmin, useRole } from "../../context/RoleContext";

const REFRESH_INTERVAL_MS = 60_000;

type DashboardContextValue = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  /** Franchise admin shop scope — "all" or a shop id. */
  shopFilter: string;
  setShopFilter: (value: string) => void;
  franchiseShops: Array<{ id: string; name: string; displayName: string | null }>;
  isFranchiseAdmin: boolean;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

function isDashboardPath(pathname: string) {
  return pathname === "/dashboard" || pathname.endsWith("/dashboard");
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { role } = useRole();
  const isFranchiseAdmin = isAdmin(role);
  const accessToken = useAuthStore((s) => s.accessToken);
  const authReady = useAuthStore((s) => s.isReady);
  const [shopFilter, setShopFilter] = useState("all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );
  const hasLoadedRef = useRef(false);
  const onDashboard = isDashboardPath(location.pathname);

  const franchiseQuery = useQuery({
    queryKey: ["my-franchise"],
    queryFn: fetchMyFranchise,
    enabled: Boolean(accessToken) && isFranchiseAdmin,
  });
  const franchiseShops = franchiseQuery.data?.shops ?? [];

  const salonIdParam =
    isFranchiseAdmin && shopFilter !== "all" ? shopFilter : undefined;

  const refresh = useCallback(async () => {
    if (!useAuthStore.getState().accessToken) {
      setLoading(false);
      return;
    }
    if (hasLoadedRef.current) setRefreshing(true);
    setError(null);
    try {
      const result = await fetchDashboard({
        salonId: salonIdParam,
      });
      setData(result);
      setLastUpdated(new Date(result.refreshedAt));
      hasLoadedRef.current = true;
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load dashboard"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salonIdParam]);

  useEffect(() => {
    const onVisibility = () => {
      setTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!accessToken) {
      setLoading(false);
      setData(null);
      setError(null);
      hasLoadedRef.current = false;
      return;
    }

    hasLoadedRef.current = false;
    setLoading(true);
    void refresh();

    if (!onDashboard || !tabVisible) return;

    const intervalId = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [authReady, accessToken, refresh, onDashboard, tabVisible, shopFilter]);

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      refreshing,
      lastUpdated,
      refresh,
      shopFilter,
      setShopFilter,
      franchiseShops,
      isFranchiseAdmin,
    }),
    [
      data,
      loading,
      error,
      refreshing,
      lastUpdated,
      refresh,
      shopFilter,
      franchiseShops,
      isFranchiseAdmin,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider");
  return ctx;
}

/** Compact INR for tight UI (sidebar overview). */
export function formatCompactInr(amount: number): string {
  const n = Math.round(amount);
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}
