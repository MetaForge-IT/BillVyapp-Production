import type { Coupon, Salon } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError, ConflictError } from "../../utils/errors";
import { salonIdFilter } from "../../utils/salonScope";
import type { AuthContext } from "../auth/auth.types";
import {
  COUPON_ERROR_CODES,
  COUPON_STATUS,
  mapCouponTypeFromDb,
  mapCouponTypeToDb,
} from "./coupons.constants";
import type { CreateCouponInput, UpdateCouponInput } from "./coupons.validators";

function mapCoupon(coupon: Coupon & { salon?: Pick<Salon, "id" | "name" | "displayName"> }) {
  return {
    id: coupon.id,
    salonId: coupon.salonId,
    salonName: coupon.salon?.displayName ?? coupon.salon?.name ?? null,
    code: coupon.code,
    title: coupon.title,
    description: coupon.description ?? "",
    type: mapCouponTypeFromDb(coupon.couponType),
    value: Number(coupon.value),
    minSpend: Number(coupon.minSpend),
    maxDiscount: coupon.maxDiscount != null ? Number(coupon.maxDiscount) : undefined,
    validFrom: coupon.validFrom.toISOString().slice(0, 10),
    validTill: coupon.validTill.toISOString().slice(0, 10),
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    status: coupon.status as "active" | "expired" | "disabled",
    applicableTo: coupon.applicableTo,
    createdAt: coupon.createdAt.toISOString(),
    updatedAt: coupon.updatedAt.toISOString(),
  };
}

export class CouponsRepository {
  async list(salonIds: string[], status?: string) {
    const coupons = await prisma.coupon.findMany({
      where: {
        ...salonIdFilter(salonIds),
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      include: {
        salon: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return coupons.map(mapCoupon);
  }

  async getById(salonIds: string[], couponId: string) {
    const coupon = await prisma.coupon.findFirst({
      where: {
        id: couponId,
        ...salonIdFilter(salonIds),
        deletedAt: null,
      },
      include: {
        salon: { select: { id: true, name: true, displayName: true } },
      },
    });
    if (!coupon) {
      throw new AppError(404, "Coupon not found", { code: COUPON_ERROR_CODES.NOT_FOUND });
    }
    return mapCoupon(coupon);
  }

  async create(auth: AuthContext, salonId: string, input: CreateCouponInput) {
    const codeUpper = input.code.trim().toUpperCase();
    const existing = await prisma.coupon.findFirst({
      where: { salonId, codeUpper, deletedAt: null },
    });
    if (existing) {
      throw new ConflictError("A coupon with this code already exists");
    }

    const coupon = await prisma.coupon.create({
      data: {
        salonId,
        code: input.code.trim(),
        codeUpper,
        title: input.title,
        description: input.description ?? null,
        couponType: mapCouponTypeToDb(input.type),
        value: input.value,
        minSpend: input.minSpend ?? 0,
        maxDiscount: input.maxDiscount ?? null,
        validFrom: new Date(input.validFrom),
        validTill: new Date(input.validTill),
        usageLimit: input.usageLimit ?? 0,
        applicableTo: input.applicableTo ?? "all",
        status: input.status ?? COUPON_STATUS.ACTIVE,
        createdById: auth.userId,
      },
      include: {
        salon: { select: { id: true, name: true, displayName: true } },
      },
    });

    return mapCoupon(coupon);
  }

  async update(auth: AuthContext, salonIds: string[], couponId: string, input: UpdateCouponInput) {
    const existing = await prisma.coupon.findFirst({
      where: {
        id: couponId,
        ...salonIdFilter(salonIds),
        deletedAt: null,
      },
    });
    if (!existing) {
      throw new AppError(404, "Coupon not found", { code: COUPON_ERROR_CODES.NOT_FOUND });
    }

    if (input.code) {
      const codeUpper = input.code.trim().toUpperCase();
      const duplicate = await prisma.coupon.findFirst({
        where: {
          salonId: existing.salonId,
          codeUpper,
          deletedAt: null,
          NOT: { id: couponId },
        },
      });
      if (duplicate) {
        throw new ConflictError("A coupon with this code already exists");
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        code: input.code?.trim(),
        codeUpper: input.code ? input.code.trim().toUpperCase() : undefined,
        title: input.title,
        description: input.description,
        couponType: input.type ? mapCouponTypeToDb(input.type) : undefined,
        value: input.value,
        minSpend: input.minSpend,
        maxDiscount: input.maxDiscount,
        validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
        validTill: input.validTill ? new Date(input.validTill) : undefined,
        usageLimit: input.usageLimit,
        applicableTo: input.applicableTo,
        status: input.status,
        updatedById: auth.userId,
      },
      include: {
        salon: { select: { id: true, name: true, displayName: true } },
      },
    });

    return mapCoupon(coupon);
  }

  async softDelete(auth: AuthContext, salonIds: string[], couponId: string) {
    const existing = await prisma.coupon.findFirst({
      where: {
        id: couponId,
        ...salonIdFilter(salonIds),
        deletedAt: null,
      },
    });
    if (!existing) {
      throw new AppError(404, "Coupon not found", { code: COUPON_ERROR_CODES.NOT_FOUND });
    }

    await prisma.coupon.update({
      where: { id: couponId },
      data: {
        deletedAt: new Date(),
        deletedById: auth.userId,
        status: COUPON_STATUS.DISABLED,
      },
    });
  }
}

export const couponsRepository = new CouponsRepository();
