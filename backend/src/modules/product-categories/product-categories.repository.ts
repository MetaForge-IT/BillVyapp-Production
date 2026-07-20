import type { ProductCategory } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import { AppError, ConflictError } from "../../utils/errors";
import {
  PRODUCT_CATEGORY_ERROR_CODES,
  PRODUCT_CATEGORY_STATUS,
} from "./product-categories.constants";
import type {
  CreateProductCategoryInput,
  UpdateProductCategoryInput,
} from "./product-categories.validators";

type ProductCategoryWithCount = ProductCategory & {
  _count: { products: number };
};

function mapStatus(isActive: boolean): "active" | "inactive" {
  return isActive ? PRODUCT_CATEGORY_STATUS.ACTIVE : PRODUCT_CATEGORY_STATUS.INACTIVE;
}

function mapProductCategory(category: ProductCategoryWithCount) {
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? "",
    status: mapStatus(category.isActive),
    sortOrder: category.sortOrder,
    productCount: category._count.products,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function toIsActive(status?: "active" | "inactive"): boolean | undefined {
  if (status === undefined) return undefined;
  return status === PRODUCT_CATEGORY_STATUS.ACTIVE;
}

export class ProductCategoriesRepository {
  async list(salonId: string) {
    const categories = await prisma.productCategory.findMany({
      where: { salonId },
      include: {
        _count: {
          select: {
            products: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return categories.map(mapProductCategory);
  }

  async getById(salonId: string, categoryId: string) {
    const category = await prisma.productCategory.findFirst({
      where: { id: categoryId, salonId },
      include: {
        _count: {
          select: {
            products: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!category) {
      throw new AppError(404, "Product category not found", {
        code: PRODUCT_CATEGORY_ERROR_CODES.NOT_FOUND,
      });
    }
    return mapProductCategory(category);
  }

  async create(auth: AuthContext, input: CreateProductCategoryInput) {
    const duplicate = await prisma.productCategory.findFirst({
      where: { salonId: auth.salonId, name: input.name },
    });
    if (duplicate) {
      throw new ConflictError("A product category with this name already exists");
    }

    const maxSortOrder = await prisma.productCategory.aggregate({
      where: { salonId: auth.salonId },
      _max: { sortOrder: true },
    });

    const category = await prisma.productCategory.create({
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
            products: { where: { deletedAt: null } },
          },
        },
      },
    });
    return mapProductCategory(category);
  }

  async update(auth: AuthContext, categoryId: string, input: UpdateProductCategoryInput) {
    const existing = await prisma.productCategory.findFirst({
      where: { id: categoryId, salonId: auth.salonId },
    });
    if (!existing) {
      throw new AppError(404, "Product category not found", {
        code: PRODUCT_CATEGORY_ERROR_CODES.NOT_FOUND,
      });
    }

    if (input.name) {
      const duplicate = await prisma.productCategory.findFirst({
        where: {
          salonId: auth.salonId,
          name: input.name,
          NOT: { id: categoryId },
        },
      });
      if (duplicate) {
        throw new ConflictError("A product category with this name already exists");
      }
    }

    const category = await prisma.productCategory.update({
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
            products: { where: { deletedAt: null } },
          },
        },
      },
    });
    return mapProductCategory(category);
  }

  async delete(auth: AuthContext, categoryId: string) {
    const existing = await prisma.productCategory.findFirst({
      where: { id: categoryId, salonId: auth.salonId },
      include: {
        _count: {
          select: {
            products: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!existing) {
      throw new AppError(404, "Product category not found", {
        code: PRODUCT_CATEGORY_ERROR_CODES.NOT_FOUND,
      });
    }
    if (existing._count.products > 0) {
      throw new AppError(400, "Cannot delete a category that has products assigned to it", {
        code: PRODUCT_CATEGORY_ERROR_CODES.HAS_PRODUCTS,
      });
    }
    await prisma.productCategory.delete({ where: { id: categoryId } });
  }
}

export const productCategoriesRepository = new ProductCategoriesRepository();
