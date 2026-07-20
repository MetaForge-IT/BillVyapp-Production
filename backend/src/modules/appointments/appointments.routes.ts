import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { appointmentsController } from "./appointments.controller";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
} from "./appointments.validators";

const appointmentsRouter = Router();

function validateRequest(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: issue.path.length > 0 ? issue.path.join(".") : "body",
          message: issue.message,
        }));
        next(new BadRequestError("Validation failed", errors));
        return;
      }
      next(error);
    }
  };
}

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
