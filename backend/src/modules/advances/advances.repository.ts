import type { CustomerAdvance } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/errors";
import type { AuthContext } from "../auth/auth.types";
import { ADVANCE_ERROR_CODES } from "./advances.constants";
import type { CreateAdvanceInput, DeductAdvanceInput, UpdateAdvanceInput } from "./advances.validators";

function mapAdvance(advance: CustomerAdvance) {
  const amount = Number(advance.amount);
  const used = Number(advance.used);

  return {
    id: advance.id,
    customerId: advance.customerId,
    customer: advance.customerName,
    phone: advance.phone,
    service: advance.service ?? "",
    amount,
    used,
    balance: Math.max(0, amount - used),
    date: advance.createdAt.toISOString().slice(0, 10),
    bookedFor: advance.bookedFor?.toISOString().slice(0, 10) ?? null,
    source: advance.source,
    createdAt: advance.createdAt.toISOString(),
    updatedAt: advance.updatedAt.toISOString(),
  };
}

export class AdvancesRepository {
  async list(salonId: string) {
    const advances = await prisma.customerAdvance.findMany({
      where: { salonId },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return advances.map(mapAdvance);
  }

  async getById(salonId: string, advanceId: string) {
    const advance = await prisma.customerAdvance.findFirst({
      where: { id: advanceId, salonId },
    });
    if (!advance) {
      throw new AppError(404, "Advance not found", { code: ADVANCE_ERROR_CODES.NOT_FOUND });
    }
    return mapAdvance(advance);
  }

  async create(auth: AuthContext, input: CreateAdvanceInput) {
    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, salonId: auth.salonId, deletedAt: null },
      });
      if (!customer) {
        throw new AppError(404, "Customer not found", { code: ADVANCE_ERROR_CODES.NOT_FOUND });
      }
    }

    const advance = await prisma.customerAdvance.create({
      data: {
        salonId: auth.salonId,
        customerId: input.customerId ?? null,
        customerName: input.customerName,
        phone: input.phone,
        service: input.service ?? null,
        amount: input.amount,
        used: 0,
        bookedFor: input.bookedFor ? new Date(input.bookedFor) : null,
        source: input.source ?? "manual",
      },
    });

    return mapAdvance(advance);
  }

  async update(auth: AuthContext, advanceId: string, input: UpdateAdvanceInput) {
    const existing = await prisma.customerAdvance.findFirst({
      where: { id: advanceId, salonId: auth.salonId },
    });
    if (!existing) {
      throw new AppError(404, "Advance not found", { code: ADVANCE_ERROR_CODES.NOT_FOUND });
    }

    if (input.amount != null && input.amount < Number(existing.used)) {
      throw new AppError(400, "Amount cannot be less than used amount", {
        code: ADVANCE_ERROR_CODES.INVALID_DEDUCT,
      });
    }

    const advance = await prisma.customerAdvance.update({
      where: { id: advanceId },
      data: {
        customerId: input.customerId,
        customerName: input.customerName,
        phone: input.phone,
        service: input.service,
        amount: input.amount,
        bookedFor: input.bookedFor ? new Date(input.bookedFor) : undefined,
        source: input.source,
      },
    });

    return mapAdvance(advance);
  }

  async deduct(auth: AuthContext, advanceId: string, input: DeductAdvanceInput) {
    const existing = await prisma.customerAdvance.findFirst({
      where: { id: advanceId, salonId: auth.salonId },
    });
    if (!existing) {
      throw new AppError(404, "Advance not found", { code: ADVANCE_ERROR_CODES.NOT_FOUND });
    }

    const amount = Number(existing.amount);
    const used = Number(existing.used);
    const balance = amount - used;

    if (input.amount > balance + 0.01) {
      throw new AppError(400, "Deduction exceeds available advance balance", {
        code: ADVANCE_ERROR_CODES.INSUFFICIENT_BALANCE,
      });
    }

    const advance = await prisma.customerAdvance.update({
      where: { id: advanceId },
      data: { used: used + input.amount },
    });

    return mapAdvance(advance);
  }

  async delete(auth: AuthContext, advanceId: string) {
    const existing = await prisma.customerAdvance.findFirst({
      where: { id: advanceId, salonId: auth.salonId },
    });
    if (!existing) {
      throw new AppError(404, "Advance not found", { code: ADVANCE_ERROR_CODES.NOT_FOUND });
    }

    await prisma.customerAdvance.delete({ where: { id: advanceId } });
  }
}

export const advancesRepository = new AdvancesRepository();
