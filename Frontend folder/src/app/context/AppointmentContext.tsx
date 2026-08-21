import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAppointment as apiCreateAppointment,
  deleteAppointment as apiDeleteAppointment,
  fetchAppointments,
  updateAppointment as apiUpdateAppointment,
  updateAppointmentStatus,
  type Appointment,
  type ApptStatus,
  type CreateAppointmentPayload,
  type UpdateAppointmentPayload,
} from "../../api/appointments";
import { getApiErrorMessage } from "../../lib/api";
import { LIST_WORKING_LIMIT } from "../../lib/pagination";
import { useAuthStore } from "../../stores/authStore";
import { queryKeys } from "../lib/queryKeys";

interface AppointmentContextType {
  appointments: Appointment[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addAppointment: (payload: CreateAppointmentPayload) => Promise<Appointment>;
  updateAppointment: (id: string, payload: UpdateAppointmentPayload) => Promise<Appointment>;
  updateStatus: (id: string, status: ApptStatus) => Promise<void>;
  /** Patch status in local cache only (e.g. after billing already completed it on the server). */
  applyLocalStatus: (id: string, status: ApptStatus) => void;
  deleteAppointment: (id: string) => Promise<void>;
}

const AppointmentContext = createContext<AppointmentContextType | null>(null);

export type { Appointment, ApptStatus };

const workingParams = { page: 1, limit: LIST_WORKING_LIMIT };

export function AppointmentProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.appointments(workingParams),
    queryFn: async () => {
      const result = await fetchAppointments(workingParams);
      return result;
    },
    enabled: Boolean(accessToken),
  });

  const appointments = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const loading = query.isLoading || (query.isFetching && !query.data);
  const error = query.error
    ? getApiErrorMessage(query.error, "Failed to load appointments")
    : null;

  const refresh = useCallback(async () => {
    if (!useAuthStore.getState().accessToken) {
      queryClient.setQueryData(queryKeys.appointments(workingParams), {
        items: [],
        page: 1,
        limit: LIST_WORKING_LIMIT,
        total: 0,
        totalPages: 1,
      });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["appointments"] });
  }, [queryClient]);

  const setAppointmentsCache = useCallback(
    (updater: (prev: Appointment[]) => Appointment[]) => {
      queryClient.setQueryData(queryKeys.appointments(workingParams), (prev: typeof query.data) => {
        const current = prev ?? {
          items: [] as Appointment[],
          page: 1,
          limit: LIST_WORKING_LIMIT,
          total: 0,
          totalPages: 1,
        };
        const items = updater(current.items);
        return {
          ...current,
          items,
          total: items.length,
          totalPages: Math.max(1, Math.ceil(items.length / current.limit) || 1),
        };
      });
    },
    [queryClient],
  );

  const addAppointment = useCallback(
    async (payload: CreateAppointmentPayload): Promise<Appointment> => {
      const created = await apiCreateAppointment(payload);
      setAppointmentsCache((prev: Appointment[]) => [...prev, created]);
      return created;
    },
    [setAppointmentsCache],
  );

  const updateAppointment = useCallback(
    async (id: string, payload: UpdateAppointmentPayload): Promise<Appointment> => {
      const updated = await apiUpdateAppointment(id, payload);
      setAppointmentsCache((prev: Appointment[]) =>
        prev.map((a: Appointment) => (a.id === id ? updated : a)),
      );
      return updated;
    },
    [setAppointmentsCache],
  );

  const updateStatus = useCallback(
    async (id: string, status: ApptStatus): Promise<void> => {
      const updated = await updateAppointmentStatus(id, status);
      setAppointmentsCache((prev: Appointment[]) =>
        prev.map((a: Appointment) => (a.id === id ? updated : a)),
      );
    },
    [setAppointmentsCache],
  );

  const applyLocalStatus = useCallback(
    (id: string, status: ApptStatus) => {
      setAppointmentsCache((prev: Appointment[]) =>
        prev.map((a: Appointment) =>
          a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a,
        ),
      );
    },
    [setAppointmentsCache],
  );

  const deleteAppointment = useCallback(
    async (id: string): Promise<void> => {
      await apiDeleteAppointment(id);
      setAppointmentsCache((prev: Appointment[]) =>
        prev.filter((a: Appointment) => a.id !== id),
      );
    },
    [setAppointmentsCache],
  );

  const value = useMemo(
    () => ({
      appointments,
      total,
      loading,
      error,
      refresh,
      addAppointment,
      updateAppointment,
      updateStatus,
      applyLocalStatus,
      deleteAppointment,
    }),
    [
      appointments,
      total,
      loading,
      error,
      refresh,
      addAppointment,
      updateAppointment,
      updateStatus,
      applyLocalStatus,
      deleteAppointment,
    ],
  );

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointments() {
  const ctx = useContext(AppointmentContext);
  if (!ctx) throw new Error("useAppointments must be inside AppointmentProvider");
  return ctx;
}
