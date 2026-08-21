import type { Appointment, AppointmentService, Customer } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import { AppError } from "../../utils/errors";
import {
  APPOINTMENT_ERROR_CODES,
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPE,
} from "./appointments.constants";
import type {
  CreateAppointmentInput,
  ListAppointmentsQuery,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
} from "./appointments.validators";
import { toPaginatedResult } from "../../utils/pagination";
import type { Prisma } from "@prisma/client";
import { appNotificationGenerator } from "../app-notifications/app-notifications.generator";
import { notificationService } from "../notifications/notification.service";

type AppointmentWithRelations = Appointment & {
  customer: Pick<Customer, "id" | "fullName" | "phone">;
  services: AppointmentService[];
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function mapStatusToFrontend(status: string): string {
  if (status === APPOINTMENT_STATUS.IN_PROGRESS) return "in-progress";
  if (status === APPOINTMENT_STATUS.NO_SHOW) return "no-show";
  return status;
}

function mapStatusFromFrontend(status: string): string {
  if (status === "in-progress") return APPOINTMENT_STATUS.IN_PROGRESS;
  if (status === "no-show" || status === "no_show") return APPOINTMENT_STATUS.NO_SHOW;
  if (status === "checked-in") return APPOINTMENT_STATUS.CONFIRMED;
  return status;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Stable YYYY-MM-DD for MySQL DATE / UTC midnight values (avoids IST off-by-one). */
function toDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function mapAppointment(appointment: AppointmentWithRelations) {
  const serviceLines = appointment.services.map((s) => ({
    serviceId: s.serviceId ?? undefined,
    itemName: s.itemName,
    price: Number(s.price),
    durationMinutes: s.durationMinutes,
  }));
  const serviceNames = serviceLines.map((s) => s.itemName);
  const appointmentType =
    appointment.appointmentType === APPOINTMENT_TYPE.WALK_IN ? "walk-in" : "appointment";

  return {
    id: appointment.id,
    sortKey: appointment.updatedAt.getTime(),
    time: formatTime(appointment.scheduledTime),
    date: formatDate(appointment.scheduledDate),
    scheduledDate: toDateKey(appointment.scheduledDate),
    duration: appointment.durationMinutes,
    customer: appointment.customer.fullName,
    customerId: appointment.customer.id,
    phone: appointment.customer.phone,
    service: serviceNames[0] ?? "",
    services: serviceNames,
    serviceLines,
    staff: appointment.staffName ?? "",
    status: mapStatusToFrontend(appointment.status),
    type: appointmentType as "appointment" | "walk-in",
    notes: appointment.notes ?? undefined,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

async function resolveAppointmentServices(
  salonId: string,
  services: CreateAppointmentInput["services"],
) {
  const resolved: Array<{
    serviceId: string;
    itemName: string;
    price: number;
    durationMinutes: number;
  }> = [];

  for (const service of services) {
    const dbService = service.serviceId
      ? await prisma.service.findFirst({
          where: { id: service.serviceId, salonId, isActive: true, deletedAt: null },
        })
      : await prisma.service.findFirst({
          where: { salonId, name: service.itemName, isActive: true, deletedAt: null },
        });

    if (!dbService) {
      throw new AppError(400, `Service "${service.itemName}" is not available for booking`, {
        code: APPOINTMENT_ERROR_CODES.SERVICE_UNAVAILABLE,
      });
    }

    resolved.push({
      serviceId: dbService.id,
      itemName: dbService.name,
      price: Number(dbService.price),
      durationMinutes: dbService.durationMinutes,
    });
  }

  return resolved;
}

async function resolveCustomerId(
  salonId: string,
  userId: string,
  input: { customerId?: string; customerName: string; customerPhone: string; appointmentType?: string },
): Promise<string> {
  if (input.customerId) {
    const existing = await prisma.customer.findFirst({
      where: { id: input.customerId, salonId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError(404, "Customer not found", {
        code: APPOINTMENT_ERROR_CODES.CUSTOMER_NOT_FOUND,
      });
    }
    return existing.id;
  }

  const phoneNormalized = normalizePhone(input.customerPhone);
  const byPhone = await prisma.customer.findFirst({
    where: { salonId, phoneNormalized, deletedAt: null },
    select: { id: true },
  });
  if (byPhone) return byPhone.id;

  const created = await prisma.customer.create({
    data: {
      salonId,
      fullName: input.customerName,
      phone: input.customerPhone,
      phoneNormalized,
      source: input.appointmentType === "walk-in" || input.appointmentType === "walk_in"
        ? "walk-in"
        : "online",
      joinedAt: new Date(),
      createdById: userId,
    },
    select: { id: true },
  });
  return created.id;
}

function parseScheduledDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export class AppointmentsRepository {
  async list(salonId: string, query: ListAppointmentsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = { salonId };
    if (query.date) {
      const day = parseScheduledDate(query.date);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      where.scheduledDate = { gte: day, lt: next };
    }

    const [total, appointments] = await prisma.$transaction([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          services: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: [{ updatedAt: "desc" }, { scheduledTime: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    return toPaginatedResult(appointments.map(mapAppointment), total, page, limit);
  }

  async create(auth: AuthContext, input: CreateAppointmentInput) {
    const customerId = await resolveCustomerId(auth.salonId, auth.userId, input);
    const appointmentType =
      input.appointmentType === "walk-in" || input.appointmentType === "walk_in"
        ? APPOINTMENT_TYPE.WALK_IN
        : APPOINTMENT_TYPE.APPOINTMENT;

    const [hours, minutes, seconds = "0"] = input.scheduledTime.split(":");
    const scheduledTime = new Date(`1970-01-01T${hours}:${minutes}:${seconds}.000Z`);
    const resolvedServices = await resolveAppointmentServices(auth.salonId, input.services);
    const durationMinutes =
      input.durationMinutes ??
      resolvedServices.reduce((sum, s) => sum + s.durationMinutes, 0);

    const appointment = await prisma.appointment.create({
      data: {
        salonId: auth.salonId,
        customerId,
        appointmentType,
        status: APPOINTMENT_STATUS.CONFIRMED,
        scheduledDate: parseScheduledDate(input.scheduledDate),
        scheduledTime,
        durationMinutes,
        staffName: input.staffName,
        notes: input.notes,
        createdById: auth.userId,
        services: {
          create: resolvedServices.map((service, index) => ({
            serviceId: service.serviceId,
            itemName: service.itemName,
            price: service.price,
            durationMinutes: service.durationMinutes,
            sortOrder: index,
          })),
        },
      },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        services: { orderBy: { sortOrder: "asc" } },
      },
    });

    void appNotificationGenerator
      .notifyNewAppointment({
        salonId: auth.salonId,
        appointmentId: appointment.id,
        customerName: appointment.customer.fullName,
        serviceName: appointment.services[0]?.itemName ?? "Service",
        scheduledDate: appointment.scheduledDate,
        scheduledTime: appointment.scheduledTime,
        staffName: appointment.staffName,
      })
      .catch(() => {});

    // Walk-ins are created at checkout time — only send payment-received (from billing).
    // Scheduled bookings still get the appointment confirmation WhatsApp.
    if (appointmentType !== APPOINTMENT_TYPE.WALK_IN && appointment.customer.phone) {
      const dateLabel = formatWhatsAppDate(appointment.scheduledDate);
      const timeLabel = formatWhatsAppTime(appointment.scheduledTime);
      void notificationService
        .sendAppointmentConfirmed({
          phone: appointment.customer.phone,
          dateLabel,
          timeLabel,
        })
        .catch(() => {});
    }

    return mapAppointment(appointment);
  }

  async updateStatus(
    auth: AuthContext,
    appointmentId: string,
    input: UpdateAppointmentStatusInput,
  ) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, salonId: auth.salonId },
    });
    if (!appointment) {
      throw new AppError(404, "Appointment not found", {
        code: APPOINTMENT_ERROR_CODES.NOT_FOUND,
      });
    }

    const status = mapStatusFromFrontend(input.status);
    const now = new Date();

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status,
        updatedById: auth.userId,
        completedAt: status === APPOINTMENT_STATUS.COMPLETED ? now : appointment.completedAt,
        cancelledAt: status === APPOINTMENT_STATUS.CANCELLED ? now : appointment.cancelledAt,
      },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        services: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (
      status === APPOINTMENT_STATUS.CANCELLED &&
      appointment.status !== APPOINTMENT_STATUS.CANCELLED
    ) {
      void appNotificationGenerator
        .notifyAppointmentCancelled({
          salonId: auth.salonId,
          appointmentId: updated.id,
          customerName: updated.customer.fullName,
          serviceName: updated.services[0]?.itemName ?? "Service",
          scheduledDate: updated.scheduledDate,
          scheduledTime: updated.scheduledTime,
        })
        .catch(() => {});
    }

    return mapAppointment(updated);
  }

  async update(auth: AuthContext, appointmentId: string, input: UpdateAppointmentInput) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, salonId: auth.salonId },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        services: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!appointment) {
      throw new AppError(404, "Appointment not found", {
        code: APPOINTMENT_ERROR_CODES.NOT_FOUND,
      });
    }

    if (input.customerName !== undefined || input.customerPhone !== undefined) {
      await prisma.customer.update({
        where: { id: appointment.customerId },
        data: {
          ...(input.customerName !== undefined ? { fullName: input.customerName } : {}),
          ...(input.customerPhone !== undefined
            ? {
                phone: input.customerPhone,
                phoneNormalized: normalizePhone(input.customerPhone),
              }
            : {}),
          updatedById: auth.userId,
        },
      });
    }

    const resolvedServices = input.services
      ? await resolveAppointmentServices(auth.salonId, input.services)
      : null;

    const status = input.status !== undefined ? mapStatusFromFrontend(input.status) : undefined;
    const now = new Date();

    let scheduledTime = appointment.scheduledTime;
    if (input.scheduledTime) {
      const [hours, minutes, seconds = "0"] = input.scheduledTime.split(":");
      scheduledTime = new Date(`1970-01-01T${hours}:${minutes}:${seconds}.000Z`);
    }

    const durationMinutes =
      resolvedServices?.reduce((sum, service) => sum + service.durationMinutes, 0) ??
      appointment.durationMinutes;

    const updated = await prisma.$transaction(async (tx) => {
      if (resolvedServices) {
        await tx.appointmentService.deleteMany({
          where: { appointmentId },
        });
      }

      return tx.appointment.update({
        where: { id: appointmentId },
        data: {
          ...(input.scheduledDate !== undefined
            ? { scheduledDate: parseScheduledDate(input.scheduledDate) }
            : {}),
          ...(input.scheduledTime !== undefined ? { scheduledTime } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(status !== undefined
            ? {
                status,
                completedAt:
                  status === APPOINTMENT_STATUS.COMPLETED
                    ? now
                    : appointment.completedAt,
                cancelledAt:
                  status === APPOINTMENT_STATUS.CANCELLED
                    ? now
                    : appointment.cancelledAt,
              }
            : {}),
          durationMinutes,
          updatedById: auth.userId,
          ...(resolvedServices
            ? {
                services: {
                  create: resolvedServices.map((service, index) => ({
                    serviceId: service.serviceId,
                    itemName: service.itemName,
                    price: service.price,
                    durationMinutes: service.durationMinutes,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          services: { orderBy: { sortOrder: "asc" } },
        },
      });
    });

    if (
      status === APPOINTMENT_STATUS.CANCELLED &&
      appointment.status !== APPOINTMENT_STATUS.CANCELLED
    ) {
      void appNotificationGenerator
        .notifyAppointmentCancelled({
          salonId: auth.salonId,
          appointmentId: updated.id,
          customerName: updated.customer.fullName,
          serviceName: updated.services[0]?.itemName ?? "Service",
          scheduledDate: updated.scheduledDate,
          scheduledTime: updated.scheduledTime,
        })
        .catch(() => {});
    }

    return mapAppointment(updated);
  }

  async delete(auth: AuthContext, appointmentId: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, salonId: auth.salonId },
      include: {
        customer: { select: { fullName: true } },
        services: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!appointment) {
      throw new AppError(404, "Appointment not found", {
        code: APPOINTMENT_ERROR_CODES.NOT_FOUND,
      });
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: APPOINTMENT_STATUS.CANCELLED,
        cancelledAt: new Date(),
        updatedById: auth.userId,
      },
    });

    if (appointment.status !== APPOINTMENT_STATUS.CANCELLED) {
      void appNotificationGenerator
        .notifyAppointmentCancelled({
          salonId: auth.salonId,
          appointmentId: appointment.id,
          customerName: appointment.customer.fullName,
          serviceName: appointment.services[0]?.itemName ?? "Service",
          scheduledDate: appointment.scheduledDate,
          scheduledTime: appointment.scheduledTime,
        })
        .catch(() => {});
    }
  }
}

function formatWhatsAppDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatWhatsAppTime(value: Date | string): string {
  if (value instanceof Date) {
    return value.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  // scheduledTime may already be "11:30 AM" or "11:30:00"
  const raw = String(value).trim();
  if (/am|pm/i.test(raw)) return raw;
  const parsed = new Date(`1970-01-01T${raw}`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  return raw;
}

export const appointmentsRepository = new AppointmentsRepository();
