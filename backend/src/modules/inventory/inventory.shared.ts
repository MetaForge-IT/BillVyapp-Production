import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/errors";

export const STOCK_STATUS = {
  OK: "ok",
  LOW: "low",
  CRITICAL: "critical",
  OUT: "out",
} as const;

export const MOVEMENT_TYPE = {
  MANUAL_ADJUSTMENT: "manual_adjustment",
  PURCHASE_RECEIVED: "purchase_received",
  RETAIL_SALE: "retail_sale",
  SERVICE_USED: "service_used",
  RESTOCK: "restock",
  BULK_IMPORT: "bulk_import",
  INITIAL_STOCK: "initial_stock",
} as const;

export const PURCHASE_STATUS = {
  RECEIVED: "received",
  CANCELLED: "cancelled",
} as const;

export const INVENTORY_ERROR_CODES = {
  NEGATIVE_STOCK: "NEGATIVE_STOCK",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
} as const;

export function computeStockStatus(stockQty: number, minStockQty: number): string {
  if (stockQty <= 0) return STOCK_STATUS.OUT;
  if (minStockQty > 0 && stockQty < minStockQty / 2) return STOCK_STATUS.CRITICAL;
  if (minStockQty > 0 && stockQty < minStockQty) return STOCK_STATUS.LOW;
  return STOCK_STATUS.OK;
}

export async function generatePoNumber(salonId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const latest = await prisma.purchaseOrder.findFirst({
    where: { salonId, poNumber: { startsWith: prefix } },
    orderBy: { poNumber: "desc" },
    select: { poNumber: true },
  });
  const nextSeq = latest
    ? Number.parseInt(latest.poNumber.slice(prefix.length), 10) + 1
    : 1;
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function applyStockChange(
  tx: Prisma.TransactionClient,
  params: {
    salonId: string;
    productId: string;
    qtyChange: number;
    movementType: string;
    note?: string;
    purchaseOrderId?: string;
    invoiceId?: bigint;
    appointmentId?: string;
  },
) {
  const product = await tx.product.findFirst({
    where: { id: params.productId, salonId: params.salonId, deletedAt: null },
  });
  if (!product) {
    throw new AppError(404, "Product not found", {
      code: INVENTORY_ERROR_CODES.PRODUCT_NOT_FOUND,
    });
  }

  const stockBefore = product.stockQty;
  const stockAfter = stockBefore + params.qtyChange;
  if (stockAfter < 0) {
    throw new AppError(400, "Stock cannot become negative", {
      code: INVENTORY_ERROR_CODES.NEGATIVE_STOCK,
    });
  }

  await tx.stockMovement.create({
    data: {
      salonId: params.salonId,
      productId: params.productId,
      movementType: params.movementType,
      qtyChange: params.qtyChange,
      stockBefore,
      stockAfter,
      note: params.note ?? null,
      purchaseOrderId: params.purchaseOrderId ?? null,
      invoiceId: params.invoiceId ?? null,
      appointmentId: params.appointmentId ?? null,
    },
  });

  const stockStatus = computeStockStatus(stockAfter, product.minStockQty);
  await tx.product.update({
    where: { id: params.productId },
    data: {
      stockQty: stockAfter,
      stockStatus,
      ...(params.qtyChange > 0 ? { lastRestockedAt: new Date() } : {}),
    },
  });

  return {
    stockBefore,
    stockAfter,
    stockStatus,
    productId: params.productId,
    productName: product.name,
    salonId: params.salonId,
  };
}

export type StockChangeResult = {
  stockBefore: number;
  stockAfter: number;
  stockStatus: string;
  productId: string;
  productName: string;
  salonId: string;
};

export function notifyStockChangeResult(result: StockChangeResult): void {
  void import("../app-notifications/app-notifications.generator").then(
    ({ appNotificationGenerator }) =>
      appNotificationGenerator.notifyStockStatusChange({
        salonId: result.salonId,
        productId: result.productId,
        productName: result.productName,
        stockQty: result.stockAfter,
        stockStatus: result.stockStatus,
      }),
  );
}
