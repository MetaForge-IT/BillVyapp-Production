import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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
import { authService } from "../../services/authService";

interface AppointmentContextType {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addAppointment: (payload: CreateAppointmentPayload) => Promise<Appointment>;
  updateAppointment: (id: string, payload: UpdateAppointmentPayload) => Promise<Appointment>;
  updateStatus: (id: string, status: ApptStatus) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
}

const AppointmentContext = createContext<AppointmentContextType | null>(null);

export type { Appointment, ApptStatus };

export function AppointmentProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppointments();
      setAppointments(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load appointments"));
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
    const created = await apiCreateAppointment(payload);
    setAppointments((prev) => [...prev, created]);
    return created;
  }

  async function updateAppointment(id: string, payload: UpdateAppointmentPayload): Promise<Appointment> {
    const updated = await apiUpdateAppointment(id, payload);
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  }

  async function updateStatus(id: string, status: ApptStatus): Promise<void> {
    const updated = await updateAppointmentStatus(id, status);
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }

  async function deleteAppointment(id: string): Promise<void> {
    await apiDeleteAppointment(id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <AppointmentContext.Provider
      value={{ appointments, loading, error, refresh, addAppointment, updateAppointment, updateStatus, deleteAppointment }}
    >
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointments() {
  const ctx = useContext(AppointmentContext);
  if (!ctx) throw new Error("useAppointments must be inside AppointmentProvider");
  return ctx;
}
