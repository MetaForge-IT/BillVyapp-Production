import { z } from "zod";

const appointmentServiceSchema = z.object({
  serviceId: z.string().uuid().optional(),
  itemName: z.string().trim().min(1).max(200),
  price: z.number().nonnegative(),
  durationMinutes: z.number().int().positive().default(30),
});

export const createAppointmentSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string().trim().min(1).max(200),
  customerPhone: z.string().trim().min(10).max(20),
  appointmentType: z.enum(["appointment", "walk_in", "walk-in"]).default("appointment"),
  scheduledDate: z.string().date(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  durationMinutes: z.number().int().positive().optional(),
  staffName: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
  services: z.array(appointmentServiceSchema).min(1),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "in_progress",
    "in-progress",
    "completed",
    "cancelled",
    "no_show",
    "no-show",
  ]),
});

export const updateAppointmentSchema = z
  .object({
    customerName: z.string().trim().min(1).max(200).optional(),
    customerPhone: z.string().trim().min(10).max(20).optional(),
    status: z.enum([
      "pending",
      "confirmed",
      "checked-in",
      "in_progress",
      "in-progress",
      "completed",
      "cancelled",
      "no_show",
      "no-show",
    ]).optional(),
    scheduledDate: z.string().date().optional(),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    notes: z.string().trim().max(1000).optional(),
    services: z.array(appointmentServiceSchema).min(1).optional(),
  })
  .refine(
    (value) =>
      value.customerName !== undefined ||
      value.customerPhone !== undefined ||
      value.status !== undefined ||
      value.scheduledDate !== undefined ||
      value.scheduledTime !== undefined ||
      value.notes !== undefined ||
      value.services !== undefined,
    { message: "At least one field must be provided to update" },
  );

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const listAppointmentsQuerySchema = z.object({
  date: z.string().date().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
