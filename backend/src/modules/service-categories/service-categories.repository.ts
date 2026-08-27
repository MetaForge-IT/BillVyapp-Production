import type { ServiceCategory } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import { AppError, ConflictError } from "../../utils/errors";
import { resolveListSalonIds, salonIdFilter } from "../../utils/salonScope";
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
  salon?: { id: string; name: string; displayName: string | null } | null;
};

function mapStatus(isActive: boolean): "active" | "inactive" {
  return isActive ? SERVICE_CATEGORY_STATUS.ACTIVE : SERVICE_CATEGORY_STATUS.INACTIVE;
}

function mapServiceCategory(category: ServiceCategoryWithCount) {
  const shopName =
    category.salon?.displayName?.trim() || category.salon?.name?.trim() || null;
  return {
    id: category.id,
    salonId: category.salonId,
    salonName: shopName,
    name: category.name,
    description: category.description ?? "",
    icon: category.icon ?? null,
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
  private async resolveWriteSalonId(auth: AuthContext, inputSalonId?: string): Promise<string> {
    if (inputSalonId) {
      const ids = await resolveListSalonIds(auth, inputSalonId);
      return ids[0]!;
    }
    if (!auth.salonId) {
      throw new AppError(400, "No shop is linked to this account. Create or open a shop first.", {
        code: SERVICE_CATEGORY_ERROR_CODES.NOT_FOUND,
      });
    }
    return auth.salonId;
  }

  private async findScopedCategory(auth: AuthContext, categoryId: string) {
    const salonIds = await resolveListSalonIds(auth);
    return prisma.serviceCategory.findFirst({
      where: { id: categoryId, ...salonIdFilter(salonIds) },
      include: {
        _count: {
          select: {
            services: {
              where: { deletedAt: null },
            },
          },
        },
        salon: { select: { id: true, name: true, displayName: true } },
      },
    });
  }

  async list(auth: AuthContext, querySalonId?: string) {
    const salonIds = await resolveListSalonIds(auth, querySalonId);
    const multiShop = salonIds.length > 1;
    const categories = await prisma.serviceCategory.findMany({
      where: salonIdFilter(salonIds),
      include: {
        _count: {
          select: {
            services: {
              where: { deletedAt: null },
            },
          },
        },
        ...(multiShop
          ? { salon: { select: { id: true, name: true, displayName: true } } }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return categories.map((category) =>
      mapServiceCategory(category as ServiceCategoryWithCount),
    );
  }

  async getById(auth: AuthContext, categoryId: string) {
    const category = await this.findScopedCategory(auth, categoryId);
    if (!category) {
      throw new AppError(404, "Service category not found", {
        code: SERVICE_CATEGORY_ERROR_CODES.NOT_FOUND,
      });
    }
    return mapServiceCategory(category);
  }

  async create(auth: AuthContext, input: CreateServiceCategoryInput) {
    const salonId = await this.resolveWriteSalonId(auth, input.salonId);

    const salon = await prisma.salon.findFirst({
      where: { id: salonId },
      select: { id: true },
    });
    if (!salon) {
      throw new AppError(400, "Linked shop was not found. Re-login or link a shop from the dashboard.", {
        code: SERVICE_CATEGORY_ERROR_CODES.NOT_FOUND,
      });
    }

    const duplicate = await prisma.serviceCategory.findFirst({
      where: { salonId, name: input.name },
    });
    if (duplicate) {
      throw new ConflictError("A service category with this name already exists");
    }

    const maxSortOrder = await prisma.serviceCategory.aggregate({
      where: { salonId },
      _max: { sortOrder: true },
    });

    const category = await prisma.serviceCategory.create({
      data: {
        salonId,
        name: input.name,
        description: input.description ?? null,
        icon: input.icon === undefined ? undefined : input.icon,
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
        salon: { select: { id: true, name: true, displayName: true } },
      },
    });

    return mapServiceCategory(category);
  }

  async update(auth: AuthContext, categoryId: string, input: UpdateServiceCategoryInput) {
    const existing = await this.findScopedCategory(auth, categoryId);
    if (!existing) {
      throw new AppError(404, "Service category not found", {
        code: SERVICE_CATEGORY_ERROR_CODES.NOT_FOUND,
      });
    }

    if (input.name) {
      const duplicate = await prisma.serviceCategory.findFirst({
        where: {
          salonId: existing.salonId,
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
        icon: input.icon === undefined ? undefined : input.icon,
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
        salon: { select: { id: true, name: true, displayName: true } },
      },
    });

    return mapServiceCategory(category);
  }

  async delete(auth: AuthContext, categoryId: string) {
    const existing = await this.findScopedCategory(auth, categoryId);
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
