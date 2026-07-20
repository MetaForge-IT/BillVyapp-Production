import { apiClient } from "../lib/axios";

export type ApptStatus =
  | "confirmed"
  | "pending"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show"
  | "checked-in"
  | "rescheduled";

export type ApptType = "appointment" | "walk-in";

export interface AppointmentServiceLine {
  serviceId?: string;
  itemName: string;
  price: number;
  durationMinutes: number;
}

export interface Appointment {
  id: string;
  sortKey: number;
  time: string;
  date: string;
  scheduledDate: string;
  duration: number;
  customer: string;
  customerId: string;
  phone: string;
  service: string;
  services?: string[];
  serviceLines?: AppointmentServiceLine[];
  staff: string;
  status: ApptStatus;
  type: ApptType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentPayload {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  appointmentType?: "appointment" | "walk-in" | "walk_in";
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes?: number;
  staffName?: string;
  notes?: string;
  services: Array<{
    serviceId?: string;
    itemName: string;
    price: number;
    durationMinutes?: number;
  }>;
}

export interface UpdateAppointmentPayload {
  customerName?: string;
  customerPhone?: string;
  status?: ApptStatus;
  scheduledDate?: string;
  scheduledTime?: string;
  notes?: string;
  services?: Array<{
    serviceId?: string;
    itemName: string;
    price: number;
    durationMinutes?: number;
  }>;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchAppointments(date?: string): Promise<Appointment[]> {
  const { data } = await apiClient.get<ApiEnvelope<Appointment[]>>("/appointments", {
    params: date ? { date } : undefined,
  });
  return data.data;
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
  const { data } = await apiClient.post<ApiEnvelope<Appointment>>("/appointments", payload);
  return data.data;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: ApptStatus,
): Promise<Appointment> {
  const { data } = await apiClient.patch<ApiEnvelope<Appointment>>(
    `/appointments/${appointmentId}/status`,
    { status },
  );
  return data.data;
}

export async function updateAppointment(
  appointmentId: string,
  payload: UpdateAppointmentPayload,
): Promise<Appointment> {
  const { data } = await apiClient.patch<ApiEnvelope<Appointment>>(
    `/appointments/${appointmentId}`,
    payload,
  );
  return data.data;
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  await apiClient.delete(`/appointments/${appointmentId}`);
}
