import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { appointmentsController } from "./appointments.controller";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
} from "./appointments.validators";

const appointmentsRouter = Router();

appointmentsRouter.use(authenticate);

appointmentsRouter.get("/", appointmentsController.list);
appointmentsRouter.post("/", validateRequest(createAppointmentSchema), appointmentsController.create);
appointmentsRouter.patch(
  "/:appointmentId/status",
  validateRequest(updateAppointmentStatusSchema),
  appointmentsController.updateStatus,
);
appointmentsRouter.patch(
  "/:appointmentId",
  validateRequest(updateAppointmentSchema),
  appointmentsController.update,
);
appointmentsRouter.delete("/:appointmentId", appointmentsController.delete);

export { appointmentsRouter };
