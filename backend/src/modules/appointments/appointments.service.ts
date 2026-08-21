import type { AuthContext } from "../auth/auth.types";
import { BadRequestError } from "../../utils/errors";
import { addDaysToDateKey, istDateKey } from "../../utils/ist";
import { appointmentsRepository } from "./appointments.repository";
import type {
  CreateAppointmentInput,
  ListAppointmentsQuery,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
} from "./appointments.validators";

/** Returning: last 7 days + any future. New customers: today + any future (no past dates). */
const APPOINTMENT_PAST_DAYS_LIMIT = 7;

function assertScheduledDateAllowed(
  scheduledDate: string,
  options?: { allowPastDays?: number },
): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
    throw new BadRequestError("Invalid scheduled date");
  }
  const allowPastDays = options?.allowPastDays ?? 0;
  const minKey = addDaysToDateKey(istDateKey(), -allowPastDays);

  if (scheduledDate < minKey) {
    if (allowPastDays === 0) {
      throw new BadRequestError(
        `Scheduled date cannot be in the past. Earliest allowed date is ${minKey}`,
      );
    }
    throw new BadRequestError(
      `Scheduled date cannot be earlier than ${minKey} (last ${allowPastDays} days only for past dates)`,
    );
  }
}

export class AppointmentsService {
  list(auth: AuthContext, query: ListAppointmentsQuery) {
    return appointmentsRepository.list(auth.salonId, query);
  }

  create(auth: AuthContext, input: CreateAppointmentInput) {
    // Existing customerId → returning (past 7 days OK). No customerId → new (today onwards only).
    const allowPastDays = input.customerId ? APPOINTMENT_PAST_DAYS_LIMIT : 0;
    assertScheduledDateAllowed(input.scheduledDate, { allowPastDays });
    return appointmentsRepository.create(auth, input);
  }

  updateStatus(auth: AuthContext, appointmentId: string, input: UpdateAppointmentStatusInput) {
    return appointmentsRepository.updateStatus(auth, appointmentId, input);
  }

  update(auth: AuthContext, appointmentId: string, input: UpdateAppointmentInput) {
    if (input.scheduledDate) {
      // Updates are for existing appointments — allow the returning-customer past window.
      assertScheduledDateAllowed(input.scheduledDate, { allowPastDays: APPOINTMENT_PAST_DAYS_LIMIT });
    }
    return appointmentsRepository.update(auth, appointmentId, input);
  }

  delete(auth: AuthContext, appointmentId: string) {
    return appointmentsRepository.delete(auth, appointmentId);
  }
}

export const appointmentsService = new AppointmentsService();
