import type { ServiceCategory } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import { AppError, ConflictError } from "../../utils/errors";
import {
  SERVICE_CATEGORY_ERROR_CODES,
  SERVICE_CATEGORY_STATUS,
} from "./service-categories.constants";
import type {
  CreateServiceCategoryInput,
  UpdateServiceCategoryInput,
} from "./service-categories.validators";

type ServiceCategoryWithCount = ServiceCategory & {
  _count: { services: number };
};

function mapStatus(isActive: boolean): "active" | "inactive" {
  return isActive ? SERVICE_CATEGORY_STATUS.ACTIVE : SERVICE_CATEGORY_STATUS.INACTIVE;
}

function mapServiceCategory(category: ServiceCategoryWithCount) {
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? "",
    status: mapStatus(category.isActive),
    sortOrder: category.sortOrder,
    serviceCount: category._count.services,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function toIsActive(status?: "active" | "inactive"): boolean | undefined {
  if (status === undefined) return undefined;
  return status === SERVICE_CATEGORY_STATUS.ACTIVE;
}

export class ServiceCategoriesRepository {
  async list(salonId: string) {
    const categories = await prisma.serviceCategory.findMany({
      where: { salonId },
      include: {
        _count: {
          select: {
            services: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return categories.map(mapServiceCategory);
  }

  async getById(salonId: string, categoryId: string) {
    const category = await prisma.serviceCategory.findFirst({
      where: { id: categoryId, salonId },
      include: {
        _count: {
          select: {
            services: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!category) {
      throw new AppError(404, "Service category not found", {
        code: SERVICE_CATEGORY_ERROR_CODES.NOT_FOUND,
      });
    }

    return mapServiceCategory(category);
  }

  async create(auth: AuthContext, input: CreateServiceCategoryInput) {
    const duplicate = await prisma.serviceCategory.findFirst({
      where: { salonId: auth.salonId, name: input.name },
    });
    if (duplicate) {
      throw new ConflictError("A service category with this name already exists");
    }

    const maxSortOrder = await prisma.serviceCategory.aggregate({
      where: { salonId: auth.salonId },
      _max: { sortOrder: true },
    });

    const category = await prisma.serviceCategory.create({
      data: {
        salonId: auth.salonId,
        name: input.name,
        description: input.description ?? null,
        isActive: toIsActive(input.status) ?? true,
        sortOrder: input.sortOrder ?? (maxSortOrder._max.sortOrder ?? 0) + 1,
      },
      include: {
        _count: {
          select: {
            services: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    return mapServiceCategory(category);
  }

  async update(auth: AuthContext, categoryId: string, input: UpdateServiceCategoryInput) {
    const existing = await prisma.serviceCategory.findFirst({
      where: { id: categoryId, salonId: auth.salonId },
    });
    if (!existing) {
      throw new AppError(404, "Service category not found", {
        code: SERVICE_CATEGORY_ERROR_CODES.NOT_FOUND,
      });
    }

    if (input.name) {
      const duplicate = await prisma.serviceCategory.findFirst({
        where: {
          salonId: auth.salonId,
          name: input.name,
          NOT: { id: categoryId },
        },
      });
      if (duplicate) {
        throw new ConflictError("A service category with this name already exists");
      }
    }

    const category = await prisma.serviceCategory.update({
      where: { id: categoryId },
      data: {
        name: input.name,
        description: input.description === "" ? null : input.description,
        isActive: toIsActive(input.status),
        sortOrder: input.sortOrder,
      },
      include: {
        _count: {
          select: {
            services: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    return mapServiceCategory(category);
  }

  async delete(auth: AuthContext, categoryId: string) {
    const existing = await prisma.serviceCategory.findFirst({
      where: { id: categoryId, salonId: auth.salonId },
      include: {
        _count: {
          select: {
            services: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new AppError(404, "Service category not found", {
        code: SERVICE_CATEGORY_ERROR_CODES.NOT_FOUND,
      });
    }

    if (existing._count.services > 0) {
      throw new AppError(400, "Cannot delete a category that has services assigned to it", {
        code: SERVICE_CATEGORY_ERROR_CODES.HAS_SERVICES,
      });
    }

    await prisma.serviceCategory.delete({
      where: { id: categoryId },
    });
  }
}

export const serviceCategoriesRepository = new ServiceCategoriesRepository();
