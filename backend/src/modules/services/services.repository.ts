import type { Service, ServiceCategory } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import { AppError, ConflictError } from "../../utils/errors";
import { SERVICE_ERROR_CODES, SERVICE_STATUS } from "./services.constants";
import type { CreateServiceInput, UpdateServiceInput } from "./services.validators";

type ServiceWithCategory = Service & {
  category: Pick<ServiceCategory, "id" | "name">;
};

function mapStatus(isActive: boolean): "active" | "inactive" {
  return isActive ? SERVICE_STATUS.ACTIVE : SERVICE_STATUS.INACTIVE;
}

function mapService(service: ServiceWithCategory) {
  return {
    id: service.id,
    name: service.name,
    categoryId: service.categoryId,
    categoryName: service.category.name,
    description: service.description ?? "",
    duration: service.durationMinutes,
    price: Number(service.price),
    memberPrice: service.memberPrice != null ? Number(service.memberPrice) : null,
    tax: service.tax != null ? Number(service.tax) : null,
    popularity: service.popularity,
    status: mapStatus(service.isActive),
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

function toIsActive(status?: "active" | "inactive"): boolean | undefined {
  if (status === undefined) return undefined;
  return status === SERVICE_STATUS.ACTIVE;
}

async function assertCategoryExists(salonId: string, categoryId: string) {
  const category = await prisma.serviceCategory.findFirst({
    where: { id: categoryId, salonId },
  });
  if (!category) {
    throw new AppError(404, "Service category not found", {
      code: SERVICE_ERROR_CODES.CATEGORY_NOT_FOUND,
    });
  }
  return category;
}

async function assertUniqueNameInCategory(
  salonId: string,
  categoryId: string,
  name: string,
  excludeServiceId?: string,
) {
  const duplicate = await prisma.service.findFirst({
    where: {
      salonId,
      categoryId,
      name,
      deletedAt: null,
      ...(excludeServiceId ? { NOT: { id: excludeServiceId } } : {}),
    },
  });
  if (duplicate) {
    throw new ConflictError("A service with this name already exists in the selected category");
  }
}

export class ServicesRepository {
  async listCatalog(salonId: string) {
    const categories = await prisma.serviceCategory.findMany({
      where: { salonId, isActive: true },
      include: {
        services: {
          where: { isActive: true, deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const catalog = categories.flatMap((category) =>
      category.services.map((service) => ({
        id: service.id,
        name: service.name,
        price: Number(service.price),
        memberPrice: service.memberPrice != null ? Number(service.memberPrice) : Number(service.price),
        duration: service.durationMinutes,
        category: category.name,
        tax: service.tax != null ? Number(service.tax) : null,
        tag:
          service.genderTag === "male"
            ? ("Male" as const)
            : service.genderTag === "female"
              ? ("Female" as const)
              : undefined,
      })),
    );

    return catalog;
  }

  async list(salonId: string) {
    const services = await prisma.service.findMany({
      where: { salonId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return services.map(mapService);
  }

  async getById(salonId: string, serviceId: string) {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, salonId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    if (!service) {
      throw new AppError(404, "Service not found", { code: SERVICE_ERROR_CODES.NOT_FOUND });
    }

    return mapService(service);
  }

  async create(auth: AuthContext, input: CreateServiceInput) {
    await assertCategoryExists(auth.salonId, input.categoryId);
    await assertUniqueNameInCategory(auth.salonId, input.categoryId, input.name);

    const service = await prisma.service.create({
      data: {
        salonId: auth.salonId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description ?? null,
        durationMinutes: input.duration,
        price: input.price,
        memberPrice: input.memberPrice ?? null,
        tax: input.tax ?? null,
        popularity: input.popularity ?? 0,
        isActive: toIsActive(input.status) ?? true,
        createdById: auth.userId,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return mapService(service);
  }

  async update(auth: AuthContext, serviceId: string, input: UpdateServiceInput) {
    const existing = await prisma.service.findFirst({
      where: { id: serviceId, salonId: auth.salonId, deletedAt: null },
    });
    if (!existing) {
      throw new AppError(404, "Service not found", { code: SERVICE_ERROR_CODES.NOT_FOUND });
    }

    const categoryId = input.categoryId ?? existing.categoryId;
    if (input.categoryId) {
      await assertCategoryExists(auth.salonId, input.categoryId);
    }

    if (input.name) {
      await assertUniqueNameInCategory(auth.salonId, categoryId, input.name, serviceId);
    }

    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        categoryId: input.categoryId,
        name: input.name,
        description: input.description === "" ? null : input.description,
        durationMinutes: input.duration,
        price: input.price,
        memberPrice: input.memberPrice,
        tax: input.tax,
        popularity: input.popularity,
        isActive: toIsActive(input.status),
        updatedById: auth.userId,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return mapService(service);
  }

  async softDelete(auth: AuthContext, serviceId: string) {
    const existing = await prisma.service.findFirst({
      where: { id: serviceId, salonId: auth.salonId, deletedAt: null },
    });
    if (!existing) {
      throw new AppError(404, "Service not found", { code: SERVICE_ERROR_CODES.NOT_FOUND });
    }

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        deletedAt: new Date(),
        deletedById: auth.userId,
        isActive: false,
      },
    });
  }
}

export const servicesRepository = new ServicesRepository();
