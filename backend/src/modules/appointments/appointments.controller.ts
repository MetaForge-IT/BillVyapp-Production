import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { appointmentsService } from "./appointments.service";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
} from "./appointments.validators";
import { listAppointmentsQuerySchema } from "./appointments.validators";

export class AppointmentsController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const query = listAppointmentsQuerySchema.parse(req.query);
    const appointments = await appointmentsService.list(auth, query);
    sendSuccess(res, { message: "Appointments retrieved", data: appointments });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateAppointmentInput;
    const appointment = await appointmentsService.create(auth, body);
    sendCreated(res, { message: "Appointment created", data: appointment });
  });

  updateStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateAppointmentStatusInput;
    const appointment = await appointmentsService.updateStatus(
      auth,
      String(req.params.appointmentId),
      body,
    );
    sendSuccess(res, { message: "Appointment status updated", data: appointment });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateAppointmentInput;
    const appointment = await appointmentsService.update(
      auth,
      String(req.params.appointmentId),
      body,
    );
    sendSuccess(res, { message: "Appointment updated", data: appointment });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await appointmentsService.delete(auth, String(req.params.appointmentId));
    sendNoContent(res);
  });
}

export const appointmentsController = new AppointmentsController();
