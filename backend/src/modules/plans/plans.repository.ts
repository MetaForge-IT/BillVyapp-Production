import type { CustomerPlanEnrollment, SalonPlan, SalonPlanService, Service } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import { AppError } from "../../utils/errors";
import { formatDbDateKey, istCalendarDate } from "../../utils/ist";
import { ENROLLMENT_STATUS, PLANS_ERROR_CODES } from "./plans.constants";
import type { CreatePlanInput, EnrollCustomerInput, UpdatePlanInput } from "./plans.validators";

const PRESET_LABELS: Record<string, string> = {
  basic: "Basic",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

type PlanWithServices = SalonPlan & {
  planServices: (SalonPlanService & { service: Pick<Service, "id" | "name"> })[];
};

type EnrollmentWithRelations = CustomerPlanEnrollment & {
  customer: { id: string; fullName: string; phone: string };
  plan: Pick<SalonPlan, "id" | "name" | "planType">;
};

function resolvePlanName(input: CreatePlanInput): string {
  if (input.namePreset === "custom") {
    return input.customName!.trim();
  }
  return PRESET_LABELS[input.namePreset] ?? input.namePreset;
}

function computeEnrollmentStatus(
  enrollment: Pick<
    CustomerPlanEnrollment,
    "expiryDate" | "servicesTotal" | "servicesUsed" | "walletTotal" | "walletUsed" | "status"
  >,
): string {
  const today = istCalendarDate();
  const expiryKey = formatDbDateKey(new Date(enrollment.expiryDate));
  const todayKey = formatDbDateKey(today);

  if (expiryKey < todayKey) return ENROLLMENT_STATUS.EXPIRED;

  const walletTotal = Number(enrollment.walletTotal);
  const walletUsed = Number(enrollment.walletUsed);
  const servicesExhausted =
    enrollment.servicesTotal > 0 && enrollment.servicesUsed >= enrollment.servicesTotal;
  const walletExhausted = walletTotal > 0 && walletUsed >= walletTotal;

  if (servicesExhausted && (walletTotal <= 0 || walletExhausted)) {
    return ENROLLMENT_STATUS.EXHAUSTED;
  }
  if (walletTotal > 0 && walletExhausted && enrollment.servicesTotal <= 0) {
    return ENROLLMENT_STATUS.EXHAUSTED;
  }

  return ENROLLMENT_STATUS.ACTIVE;
}

function mapPlan(plan: PlanWithServices) {
  return {
    id: plan.id,
    name: plan.name,
    namePreset: plan.namePreset,
    planType: plan.planType,
    price: Number(plan.price),
    walletAmount: plan.walletAmount != null ? Number(plan.walletAmount) : null,
    validityDays: plan.validityDays,
    serviceLimit: plan.serviceLimit,
    discountPercent: plan.discountPercent != null ? Number(plan.discountPercent) : null,
    description: plan.description,
    isActive: plan.isActive,
    includedServices: plan.planServices.map((ps) => ({
      serviceId: ps.serviceId,
      serviceName: ps.service.name,
      quantity: ps.quantity,
    })),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

function mapEnrollment(enrollment: EnrollmentWithRelations) {
  const status = computeEnrollmentStatus(enrollment);
  const walletTotal = Number(enrollment.walletTotal);
  const walletUsed = Number(enrollment.walletUsed);

  return {
    id: enrollment.publicId,
    customerId: enrollment.customerId,
    customer: enrollment.customer.fullName,
    phone: enrollment.customer.phone,
    packageName: enrollment.plan.name,
    planType: enrollment.plan.planType,
    planId: enrollment.plan.id,
    status: status.charAt(0).toUpperCase() + status.slice(1),
    servicesTotal: enrollment.servicesTotal,
    servicesUsed: enrollment.servicesUsed,
    walletTotal,
    walletUsed,
    walletBalance: Math.max(0, walletTotal - walletUsed),
    expiry: enrollment.expiryDate.toISOString().slice(0, 10),
    amountPaid: Number(enrollment.amountPaid),
    startDate: enrollment.startDate.toISOString().slice(0, 10),
  };
}

export class PlansRepository {
  async listServices(salonId: string) {
    const services = await prisma.service.findMany({
      where: { salonId, isActive: true, deletedAt: null },
      select: { id: true, name: true, price: true, durationMinutes: true },
      orderBy: { name: "asc" },
    });

    return services.map((s) => ({
      id: s.id,
      name: s.name,
      price: Number(s.price),
      durationMinutes: s.durationMinutes,
    }));
  }

  async listCustomers(salonId: string) {
    const customers = await prisma.customer.findMany({
      where: { salonId, deletedAt: null, status: "active" },
      select: { id: true, fullName: true, phone: true },
      orderBy: { fullName: "asc" },
      take: 500,
    });
    return customers;
  }

  async listPlans(salonId: string) {
    const plans = await prisma.salonPlan.findMany({
      where: { salonId },
      include: {
        planServices: {
          include: { service: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    });
    return plans.map(mapPlan);
  }

  async createPlan(auth: AuthContext, input: CreatePlanInput) {
    const serviceIds = input.includedServices?.map((s) => s.serviceId) ?? [];
    if (serviceIds.length > 0) {
      const count = await prisma.service.count({
        where: { salonId: auth.salonId, id: { in: serviceIds }, deletedAt: null },
      });
      if (count !== serviceIds.length) {
        throw new AppError(404, "One or more services not found", {
          code: PLANS_ERROR_CODES.SERVICE_NOT_FOUND,
        });
      }
    }

    const name = resolvePlanName(input);

    const plan = await prisma.salonPlan.create({
      data: {
        salonId: auth.salonId,
        name,
        namePreset: input.namePreset,
        planType: input.planType,
        price: input.price,
        walletAmount: input.walletAmount ?? null,
        validityDays: input.validityDays,
        serviceLimit: input.serviceLimit ?? null,
        discountPercent: input.discountPercent ?? null,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
        planServices: {
          create: (input.includedServices ?? []).map((s) => ({
            serviceId: s.serviceId,
            quantity: s.quantity ?? 1,
          })),
        },
      },
      include: {
        planServices: {
          include: { service: { select: { id: true, name: true } } },
        },
      },
    });

    return mapPlan(plan);
  }

  async updatePlan(auth: AuthContext, planId: string, input: UpdatePlanInput) {
    const existing = await prisma.salonPlan.findFirst({
      where: { id: planId, salonId: auth.salonId },
    });
    if (!existing) {
      throw new AppError(404, "Plan not found", {
        code: PLANS_ERROR_CODES.PLAN_NOT_FOUND,
      });
    }

    const serviceIds = input.includedServices?.map((s) => s.serviceId) ?? [];
    if (serviceIds.length > 0) {
      const count = await prisma.service.count({
        where: { salonId: auth.salonId, id: { in: serviceIds }, deletedAt: null },
      });
      if (count !== serviceIds.length) {
        throw new AppError(404, "One or more services not found", {
          code: PLANS_ERROR_CODES.SERVICE_NOT_FOUND,
        });
      }
    }

    const name = input.namePreset ? resolvePlanName(input as CreatePlanInput) : undefined;

    const plan = await prisma.$transaction(async (tx) => {
      if (input.includedServices) {
        await tx.salonPlanService.deleteMany({ where: { planId } });
        if (input.includedServices.length > 0) {
          await tx.salonPlanService.createMany({
            data: input.includedServices.map((s) => ({
              planId,
              serviceId: s.serviceId,
              quantity: s.quantity ?? 1,
            })),
          });
        }
      }

      return tx.salonPlan.update({
        where: { id: planId },
        data: {
          name,
          namePreset: input.namePreset,
          planType: input.planType,
          price: input.price,
          walletAmount: input.walletAmount,
          validityDays: input.validityDays,
          serviceLimit: input.serviceLimit,
          discountPercent: input.discountPercent,
          description: input.description,
          isActive: input.isActive,
        },
        include: {
          planServices: {
            include: { service: { select: { id: true, name: true } } },
          },
        },
      });
    });

    return mapPlan(plan);
  }

  async listEnrollments(salonId: string) {
    const enrollments = await prisma.customerPlanEnrollment.findMany({
      where: { salonId },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        plan: { select: { id: true, name: true, planType: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return enrollments.map(mapEnrollment);
  }

  async enrollCustomer(auth: AuthContext, input: EnrollCustomerInput) {
    const [customer, plan] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: input.customerId, salonId: auth.salonId, deletedAt: null },
      }),
      prisma.salonPlan.findFirst({
        where: { id: input.planId, salonId: auth.salonId, isActive: true },
      }),
    ]);

    if (!customer) {
      throw new AppError(404, "Customer not found", {
        code: PLANS_ERROR_CODES.CUSTOMER_NOT_FOUND,
      });
    }
    if (!plan) {
      throw new AppError(404, "Plan not found", {
        code: PLANS_ERROR_CODES.PLAN_NOT_FOUND,
      });
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + plan.validityDays);

    const walletTotal = plan.walletAmount != null ? Number(plan.walletAmount) : 0;
    const servicesTotal = plan.serviceLimit ?? 0;

    const tierSlug =
      plan.planType === "membership" &&
      plan.namePreset &&
      plan.namePreset !== "custom"
        ? plan.namePreset
        : null;

    const membershipTier = tierSlug
      ? await prisma.membershipTier.findFirst({
          where: { salonId: auth.salonId, slug: tierSlug, isActive: true },
        })
      : null;

    const enrollment = await prisma.$transaction(async (tx) => {
      const created = await tx.customerPlanEnrollment.create({
        data: {
          salonId: auth.salonId,
          customerId: customer.id,
          planId: plan.id,
          status: ENROLLMENT_STATUS.ACTIVE,
          walletTotal,
          walletUsed: 0,
          servicesTotal,
          servicesUsed: 0,
          startDate,
          expiryDate,
          amountPaid: input.amountPaid ?? Number(plan.price),
        },
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          plan: { select: { id: true, name: true, planType: true } },
        },
      });

      if (membershipTier) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { currentTierId: membershipTier.id, updatedById: auth.userId },
        });
      }

      return created;
    });

    return mapEnrollment(enrollment);
  }
}

export const plansRepository = new PlansRepository();
