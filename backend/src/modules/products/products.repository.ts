import type { Product, ProductCategory, Vendor } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import {
  applyStockChange,
  computeStockStatus,
  MOVEMENT_TYPE,
  notifyStockChangeResult,
} from "../inventory/inventory.shared";
import { AppError, ConflictError } from "../../utils/errors";
import { PRODUCT_ERROR_CODES, PRODUCT_STATUS } from "./products.constants";
import type { CreateProductInput, UpdateProductInput } from "./products.validators";

type ProductWithRelations = Product & {
  category: Pick<ProductCategory, "id" | "name">;
  vendor: Pick<Vendor, "id" | "name"> | null;
};

function mapStatus(isActive: boolean): "active" | "inactive" {
  return isActive ? PRODUCT_STATUS.ACTIVE : PRODUCT_STATUS.INACTIVE;
}

function mapProduct(product: ProductWithRelations) {
  return {
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    brand: product.brand ?? "",
    vendorId: product.vendorId,
    vendorName: product.vendor?.name ?? "",
    barcode: product.barcode ?? "",
    sku: product.sku,
    purchasePrice: Number(product.costPrice),
    sellingPrice: Number(product.retailPrice),
    gstRate: product.gstRate != null ? Number(product.gstRate) : null,
    currentStock: product.stockQty,
    minimumStock: product.minStockQty,
    unit: product.unit,
    stockStatus: product.stockStatus,
    status: mapStatus(product.isActive),
    lastRestockedAt: product.lastRestockedAt?.toISOString() ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function toIsActive(status?: "active" | "inactive"): boolean | undefined {
  if (status === undefined) return undefined;
  return status === PRODUCT_STATUS.ACTIVE;
}

const productInclude = {
  category: { select: { id: true, name: true } },
  vendor: { select: { id: true, name: true } },
} as const;

async function assertCategoryExists(salonId: string, categoryId: string) {
  const category = await prisma.productCategory.findFirst({
    where: { id: categoryId, salonId },
  });
  if (!category) {
    throw new AppError(404, "Product category not found", {
      code: PRODUCT_ERROR_CODES.CATEGORY_NOT_FOUND,
    });
  }
}

async function assertVendorExists(salonId: string, vendorId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, salonId, deletedAt: null },
  });
  if (!vendor) {
    throw new AppError(404, "Vendor not found", {
      code: PRODUCT_ERROR_CODES.VENDOR_NOT_FOUND,
    });
  }
}

async function assertUniqueName(salonId: string, name: string, excludeProductId?: string) {
  const duplicate = await prisma.product.findFirst({
    where: {
      salonId,
      name,
      deletedAt: null,
      ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
    },
  });
  if (duplicate) {
    throw new ConflictError("A product with this name already exists");
  }
}

async function assertUniqueSku(salonId: string, sku: string, excludeProductId?: string) {
  const duplicate = await prisma.product.findFirst({
    where: {
      salonId,
      sku,
      deletedAt: null,
      ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
    },
  });
  if (duplicate) {
    throw new ConflictError("A product with this SKU already exists");
  }
}

async function assertUniqueBarcode(
  salonId: string,
  barcode: string | undefined | null,
  excludeProductId?: string,
) {
  if (!barcode) return;
  const duplicate = await prisma.product.findFirst({
    where: {
      salonId,
      barcode,
      deletedAt: null,
      ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
    },
  });
  if (duplicate) {
    throw new ConflictError("A product with this barcode already exists");
  }
}

export class ProductsRepository {
  async list(salonId: string, filters?: { categoryId?: string; status?: string; stockStatus?: string; search?: string }) {
    const products = await prisma.product.findMany({
      where: {
        salonId,
        deletedAt: null,
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.status === PRODUCT_STATUS.ACTIVE ? { isActive: true } : {}),
        ...(filters?.status === PRODUCT_STATUS.INACTIVE ? { isActive: false } : {}),
        ...(filters?.stockStatus ? { stockStatus: filters.stockStatus } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search } },
                { sku: { contains: filters.search } },
                { barcode: { contains: filters.search } },
                { brand: { contains: filters.search } },
              ],
            }
          : {}),
      },
      include: productInclude,
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    });
    return products.map(mapProduct);
  }

  async getById(salonId: string, productId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, salonId, deletedAt: null },
      include: productInclude,
    });
    if (!product) {
      throw new AppError(404, "Product not found", { code: PRODUCT_ERROR_CODES.NOT_FOUND });
    }
    return mapProduct(product);
  }

  async create(auth: AuthContext, input: CreateProductInput) {
    await assertCategoryExists(auth.salonId, input.categoryId);
    if (input.vendorId) await assertVendorExists(auth.salonId, input.vendorId);
    await assertUniqueName(auth.salonId, input.name);
    await assertUniqueSku(auth.salonId, input.sku);
    await assertUniqueBarcode(auth.salonId, input.barcode);

    const initialStock = input.currentStock ?? 0;
    const minStock = input.minimumStock ?? 0;

    const createdResult = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          salonId: auth.salonId,
          categoryId: input.categoryId,
          vendorId: input.vendorId ?? null,
          sku: input.sku,
          name: input.name,
          brand: input.brand ?? null,
          barcode: input.barcode ?? null,
          unit: input.unit ?? "pcs",
          stockQty: 0,
          minStockQty: minStock,
          costPrice: input.purchasePrice,
          retailPrice: input.sellingPrice,
          gstRate: input.gstRate ?? null,
          stockStatus: computeStockStatus(0, minStock),
          isActive: toIsActive(input.status) ?? true,
          createdById: auth.userId,
        },
        include: productInclude,
      });

      let stockResult = null;
      if (initialStock > 0) {
        stockResult = await applyStockChange(tx, {
          salonId: auth.salonId,
          productId: created.id,
          qtyChange: initialStock,
          movementType: MOVEMENT_TYPE.INITIAL_STOCK,
          note: "Initial stock on product creation",
        });
      }

      const saved = await tx.product.findFirstOrThrow({
        where: { id: created.id },
        include: productInclude,
      });

      return { product: saved, stockResult };
    });

    if (createdResult.stockResult) {
      notifyStockChangeResult(createdResult.stockResult);
    }

    return mapProduct(createdResult.product);
  }

  async update(auth: AuthContext, productId: string, input: UpdateProductInput) {
    const existing = await prisma.product.findFirst({
      where: { id: productId, salonId: auth.salonId, deletedAt: null },
    });
    if (!existing) {
      throw new AppError(404, "Product not found", { code: PRODUCT_ERROR_CODES.NOT_FOUND });
    }

    if (input.categoryId) await assertCategoryExists(auth.salonId, input.categoryId);
    if (input.vendorId) await assertVendorExists(auth.salonId, input.vendorId);
    if (input.name) await assertUniqueName(auth.salonId, input.name, productId);
    if (input.sku) await assertUniqueSku(auth.salonId, input.sku, productId);
    if (input.barcode !== undefined) {
      await assertUniqueBarcode(auth.salonId, input.barcode, productId);
    }

    const nextMinStock = input.minimumStock ?? existing.minStockQty;

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        categoryId: input.categoryId,
        vendorId: input.vendorId === undefined ? undefined : input.vendorId ?? null,
        sku: input.sku,
        name: input.name,
        brand: input.brand === "" ? null : input.brand,
        barcode: input.barcode === "" ? null : input.barcode,
        unit: input.unit,
        minStockQty: input.minimumStock,
        costPrice: input.purchasePrice,
        retailPrice: input.sellingPrice,
        gstRate: input.gstRate,
        stockStatus: computeStockStatus(existing.stockQty, nextMinStock),
        isActive: toIsActive(input.status),
        updatedById: auth.userId,
      },
      include: productInclude,
    });

    return mapProduct(product);
  }

  async softDelete(auth: AuthContext, productId: string) {
    const existing = await prisma.product.findFirst({
      where: { id: productId, salonId: auth.salonId, deletedAt: null },
      include: {
        _count: {
          select: {
            invoiceLineItems: true,
            stockMovements: true,
            purchaseOrderItems: true,
          },
        },
      },
    });
    if (!existing) {
      throw new AppError(404, "Product not found", { code: PRODUCT_ERROR_CODES.NOT_FOUND });
    }

    const nonInitialMovements = await prisma.stockMovement.count({
      where: {
        productId,
        movementType: { not: MOVEMENT_TYPE.INITIAL_STOCK },
      },
    });

    const hasTransactions =
      existing._count.invoiceLineItems > 0 ||
      existing._count.purchaseOrderItems > 0 ||
      nonInitialMovements > 0;

    if (hasTransactions) {
      throw new AppError(400, "Cannot delete a product that has transaction history", {
        code: PRODUCT_ERROR_CODES.HAS_TRANSACTIONS,
      });
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
        deletedById: auth.userId,
        isActive: false,
      },
    });
  }
}

export const productsRepository = new ProductsRepository();
