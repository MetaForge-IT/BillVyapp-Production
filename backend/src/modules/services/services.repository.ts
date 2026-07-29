import type { Prisma, Service, ServiceCategory, ServiceGender } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import { AppError, ConflictError } from "../../utils/errors";
import { SERVICE_ERROR_CODES, SERVICE_STATUS } from "./services.constants";
import {
  buildSearchableName,
  buildServiceCode,
  inferServiceGroup,
} from "./services.catalog";
import type {
  CreateServiceInput,
  ListServicesQuery,
  UpdateServiceInput,
} from "./services.validators";

type ServiceWithCategory = Service & {
  category: Pick<ServiceCategory, "id" | "name" | "icon">;
};

function mapStatus(isActive: boolean): "active" | "inactive" {
  return isActive ? SERVICE_STATUS.ACTIVE : SERVICE_STATUS.INACTIVE;
}

function mapGenderTag(gender: ServiceGender): "Male" | "Female" | undefined {
  if (gender === "MALE") return "Male";
  if (gender === "FEMALE") return "Female";
  return undefined;
}

function mapService(service: ServiceWithCategory) {
  return {
    id: service.id,
    serviceCode: service.serviceCode,
    name: service.name,
    displayName: service.displayName,
    serviceGroup: service.serviceGroup,
    categoryId: service.categoryId,
    categoryName: service.category.name,
    categoryIcon: service.category.icon,
    description: service.description ?? "",
    duration: service.durationMinutes,
    price: Number(service.price),
    memberPrice: service.memberPrice != null ? Number(service.memberPrice) : null,
    tax: service.tax != null ? Number(service.tax) : null,
    gender: service.gender,
    popularity: service.popularity,
    sortOrder: service.sortOrder,
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

async function assertUniqueServiceCode(
  salonId: string,
  serviceCode: string,
  excludeServiceId?: string,
) {
  const duplicate = await prisma.service.findFirst({
    where: {
      salonId,
      serviceCode,
      ...(excludeServiceId ? { NOT: { id: excludeServiceId } } : {}),
    },
  });
  if (duplicate) {
    throw new ConflictError("A service with this service code already exists");
  }
}

async function uniqueCodeForSalon(
  salonId: string,
  base: string,
): Promise<string> {
  let code = base.slice(0, 64);
  let attempt = 0;
  while (attempt < 20) {
    const exists = await prisma.service.findFirst({
      where: { salonId, serviceCode: code },
      select: { id: true },
    });
    if (!exists) return code;
    attempt += 1;
    code = `${base.slice(0, 55)}-${attempt}`.slice(0, 64);
  }
  return `${base.slice(0, 48)}-${Date.now().toString(36)}`.slice(0, 64);
}

export class ServicesRepository {
  async listCatalog(salonId: string) {
    const categories = await prisma.serviceCategory.findMany({
      where: { salonId, isActive: true },
      include: {
        services: {
          where: { isActive: true, deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Flat catalog kept for appointments / billing / packages (backward compatible)
    return categories.flatMap((category) =>
      category.services.map((service) => ({
        id: service.id,
        name: service.name,
        displayName: service.displayName,
        serviceGroup: service.serviceGroup,
        serviceCode: service.serviceCode,
        price: Number(service.price),
        memberPrice:
          service.memberPrice != null ? Number(service.memberPrice) : Number(service.price),
        duration: service.durationMinutes,
        category: category.name,
        categoryId: category.id,
        tax: service.tax != null ? Number(service.tax) : null,
        gender: service.gender,
        tag: mapGenderTag(service.gender),
      })),
    );
  }

  async list(salonId: string, query: ListServicesQuery) {
    const where: Prisma.ServiceWhereInput = {
      salonId,
      deletedAt: null,
    };

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.serviceGroup) where.serviceGroup = query.serviceGroup;
    if (query.active !== undefined) where.isActive = query.active;

    if (query.gender === "MALE") {
      where.gender = { in: ["MALE", "UNISEX"] };
    } else if (query.gender === "FEMALE") {
      where.gender = { in: ["FEMALE", "UNISEX"] };
    } else if (query.gender === "UNISEX") {
      where.gender = "UNISEX";
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term } },
        { displayName: { contains: term } },
        { serviceGroup: { contains: term } },
        { serviceCode: { contains: term } },
        { category: { name: { contains: term } } },
      ];
    }

    const sortMap: Record<string, Prisma.ServiceOrderByWithRelationInput> = {
      sortOrder: { sortOrder: "asc" },
      name: { name: "asc" },
      displayName: { displayName: "asc" },
      price: { price: "asc" },
      createdAt: { createdAt: "desc" },
      popularity: { popularity: "desc" },
    };

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [total, services] = await prisma.$transaction([
      prisma.service.count({ where }),
      prisma.service.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, icon: true } },
        },
        orderBy: [sortMap[query.sort ?? "sortOrder"] ?? { sortOrder: "asc" }, { displayName: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      items: services.map(mapService),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getById(salonId: string, serviceId: string) {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, salonId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });

    if (!service) {
      throw new AppError(404, "Service not found", { code: SERVICE_ERROR_CODES.NOT_FOUND });
    }

    return mapService(service);
  }

  async create(auth: AuthContext, input: CreateServiceInput) {
    const category = await assertCategoryExists(auth.salonId, input.categoryId);
    const displayName = (input.displayName ?? input.name)!.trim();
    const gender = input.gender ?? "UNISEX";
    const serviceGroup =
      input.serviceGroup === undefined
        ? inferServiceGroup(category.name, displayName)
        : input.serviceGroup;

    const name =
      input.name?.trim() ||
      buildSearchableName(category.name, serviceGroup, displayName, gender);

    const baseCode =
      input.serviceCode?.trim() ||
      buildServiceCode({
        gender,
        categoryName: category.name,
        serviceGroup,
        displayName,
      });
    const serviceCode = await uniqueCodeForSalon(auth.salonId, baseCode);
    await assertUniqueServiceCode(auth.salonId, serviceCode);

    const service = await prisma.service.create({
      data: {
        salonId: auth.salonId,
        categoryId: input.categoryId,
        serviceCode,
        name,
        displayName,
        serviceGroup,
        description: input.description ?? null,
        durationMinutes: input.duration,
        price: input.price,
        memberPrice: input.memberPrice ?? null,
        tax: input.tax ?? null,
        popularity: input.popularity ?? 0,
        sortOrder: input.sortOrder ?? 0,
        gender,
        isActive: toIsActive(input.status) ?? true,
        createdById: auth.userId,
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });

    return mapService(service);
  }

  async update(auth: AuthContext, serviceId: string, input: UpdateServiceInput) {
    const existing = await prisma.service.findFirst({
      where: { id: serviceId, salonId: auth.salonId, deletedAt: null },
      include: { category: true },
    });
    if (!existing) {
      throw new AppError(404, "Service not found", { code: SERVICE_ERROR_CODES.NOT_FOUND });
    }

    const categoryId = input.categoryId ?? existing.categoryId;
    const category =
      input.categoryId && input.categoryId !== existing.categoryId
        ? await assertCategoryExists(auth.salonId, input.categoryId)
        : existing.category;

    const displayName = input.displayName?.trim() ?? existing.displayName;
    const serviceGroup =
      input.serviceGroup !== undefined ? input.serviceGroup : existing.serviceGroup;
    const gender = input.gender ?? existing.gender;

    // Rebuild searchable name when display/group/category change unless name explicitly sent
    const name =
      input.name?.trim() ??
      (input.displayName || input.serviceGroup !== undefined || input.categoryId
        ? buildSearchableName(category.name, serviceGroup, displayName, gender)
        : existing.name);

    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        categoryId,
        // serviceCode is immutable after create
        name,
        displayName,
        serviceGroup,
        description: input.description === "" ? null : input.description,
        durationMinutes: input.duration,
        price: input.price,
        memberPrice: input.memberPrice,
        tax: input.tax,
        popularity: input.popularity,
        sortOrder: input.sortOrder,
        gender,
        isActive: toIsActive(input.status),
        updatedById: auth.userId,
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
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
        isActive: false,
        deletedAt: new Date(),
        deletedById: auth.userId,
        updatedById: auth.userId,
      },
    });
  }
}

export const servicesRepository = new ServicesRepository();
