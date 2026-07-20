import type { PurchaseOrder, PurchaseOrderItem, Product, Vendor } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import {
  applyStockChange,
  generatePoNumber,
  MOVEMENT_TYPE,
  notifyStockChangeResult,
  PURCHASE_STATUS,
  type StockChangeResult,
} from "../inventory/inventory.shared";
import { AppError } from "../../utils/errors";
import { STOCK_PURCHASE_ERROR_CODES } from "./stock-purchases.constants";
import type { CreateStockPurchaseInput, UpdateStockPurchaseInput } from "./stock-purchases.validators";

type PurchaseWithRelations = PurchaseOrder & {
  vendor: Pick<Vendor, "id" | "name">;
  items: (PurchaseOrderItem & { product: Pick<Product, "id" | "name" | "sku"> })[];
};

function mapPurchase(purchase: PurchaseWithRelations) {
  return {
    id: purchase.id,
    poNumber: purchase.poNumber,
    vendorId: purchase.vendorId,
    vendorName: purchase.vendor.name,
    status: purchase.status,
    orderDate: purchase.orderDate.toISOString().slice(0, 10),
    expectedDate: purchase.expectedDate?.toISOString().slice(0, 10) ?? null,
    deliveredDate: purchase.deliveredDate?.toISOString().slice(0, 10) ?? null,
    totalAmount: Number(purchase.totalAmount),
    notes: purchase.notes ?? "",
    items: purchase.items.map((item) => ({
      id: item.publicId,
      productId: item.productId,
      productName: item.product.name,
      sku: item.product.sku,
      quantity: item.quantityOrdered,
      quantityReceived: item.quantityReceived,
      unitCost: Number(item.unitCost),
      lineTotal: Number(item.lineTotal),
    })),
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
  };
}

const purchaseInclude = {
  vendor: { select: { id: true, name: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } },
    },
  },
} as const;

export class StockPurchasesRepository {
  async list(salonId: string) {
    const purchases = await prisma.purchaseOrder.findMany({
      where: { salonId, status: { not: PURCHASE_STATUS.CANCELLED } },
      include: purchaseInclude,
      orderBy: { createdAt: "desc" },
    });
    return purchases.map(mapPurchase);
  }

  async getById(salonId: string, purchaseId: string) {
    const purchase = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseId, salonId },
      include: purchaseInclude,
    });
    if (!purchase) {
      throw new AppError(404, "Stock purchase not found", {
        code: STOCK_PURCHASE_ERROR_CODES.NOT_FOUND,
      });
    }
    return mapPurchase(purchase);
  }

  async create(auth: AuthContext, input: CreateStockPurchaseInput) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: input.vendorId, salonId: auth.salonId, deletedAt: null },
    });
    if (!vendor) {
      throw new AppError(404, "Vendor not found", {
        code: STOCK_PURCHASE_ERROR_CODES.VENDOR_NOT_FOUND,
      });
    }

    const productIds = input.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        salonId: auth.salonId,
        deletedAt: null,
      },
    });
    if (products.length !== productIds.length) {
      throw new AppError(404, "One or more products were not found", {
        code: STOCK_PURCHASE_ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    }

    const orderDate = input.orderDate ? new Date(input.orderDate) : new Date();
    const poNumber = await generatePoNumber(auth.salonId);
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );

    const { purchase, stockResults } = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          salonId: auth.salonId,
          vendorId: input.vendorId,
          poNumber,
          status: PURCHASE_STATUS.RECEIVED,
          orderDate,
          deliveredDate: orderDate,
          totalAmount,
          notes: input.notes ?? null,
          createdById: auth.userId,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantityOrdered: item.quantity,
              quantityReceived: item.quantity,
              unitCost: item.unitCost,
              lineTotal: item.quantity * item.unitCost,
            })),
          },
        },
        include: purchaseInclude,
      });

      const stockResults: StockChangeResult[] = [];

      for (const item of input.items) {
        const stockResult = await applyStockChange(tx, {
          salonId: auth.salonId,
          productId: item.productId,
          qtyChange: item.quantity,
          movementType: MOVEMENT_TYPE.PURCHASE_RECEIVED,
          purchaseOrderId: created.id,
          note: `Stock purchase ${poNumber}`,
        });
        stockResults.push(stockResult);

        await tx.product.update({
          where: { id: item.productId },
          data: { costPrice: item.unitCost },
        });
      }

      return { purchase: created, stockResults };
    });

    stockResults.forEach(notifyStockChangeResult);

    return mapPurchase(purchase);
  }

  async update(auth: AuthContext, purchaseId: string, input: UpdateStockPurchaseInput) {
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseId, salonId: auth.salonId },
    });
    if (!existing) {
      throw new AppError(404, "Stock purchase not found", {
        code: STOCK_PURCHASE_ERROR_CODES.NOT_FOUND,
      });
    }

    const purchase = await prisma.purchaseOrder.update({
      where: { id: purchaseId },
      data: {
        notes: input.notes === "" ? null : input.notes,
        updatedById: auth.userId,
      },
      include: purchaseInclude,
    });
    return mapPurchase(purchase);
  }

  async delete(auth: AuthContext, purchaseId: string) {
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseId, salonId: auth.salonId },
    });
    if (!existing) {
      throw new AppError(404, "Stock purchase not found", {
        code: STOCK_PURCHASE_ERROR_CODES.NOT_FOUND,
      });
    }

    throw new AppError(400, "Cannot delete a stock purchase that has updated inventory", {
      code: STOCK_PURCHASE_ERROR_CODES.CANNOT_DELETE,
    });
  }
}

export const stockPurchasesRepository = new StockPurchasesRepository();
