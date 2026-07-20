import type { AuthContext } from "../auth/auth.types";
import { appointmentsRepository } from "./appointments.repository";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
} from "./appointments.validators";

export class AppointmentsService {
  list(auth: AuthContext, scheduledDate?: string) {
    return appointmentsRepository.list(auth.salonId, scheduledDate);
  }

  create(auth: AuthContext, input: CreateAppointmentInput) {
    return appointmentsRepository.create(auth, input);
  }

  updateStatus(auth: AuthContext, appointmentId: string, input: UpdateAppointmentStatusInput) {
    return appointmentsRepository.updateStatus(auth, appointmentId, input);
  }

  update(auth: AuthContext, appointmentId: string, input: UpdateAppointmentInput) {
    return appointmentsRepository.update(auth, appointmentId, input);
  }

  delete(auth: AuthContext, appointmentId: string) {
    return appointmentsRepository.delete(auth, appointmentId);
  }
}

export const appointmentsService = new AppointmentsService();
