import type { Product, StockMovement } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import { applyStockChange, MOVEMENT_TYPE, notifyStockChangeResult } from "../inventory/inventory.shared";
import { AppError } from "../../utils/errors";
import { STOCK_ADJUSTMENT_ERROR_CODES } from "./stock-adjustments.constants";
import type { CreateStockAdjustmentInput, UpdateStockAdjustmentInput } from "./stock-adjustments.validators";

type AdjustmentWithProduct = StockMovement & {
  product: Pick<Product, "id" | "name" | "sku">;
};

function mapAdjustment(adjustment: AdjustmentWithProduct) {
  return {
    id: adjustment.publicId,
    productId: adjustment.productId,
    productName: adjustment.product.name,
    sku: adjustment.product.sku,
    movementType: adjustment.movementType,
    quantityChange: adjustment.qtyChange,
    stockBefore: adjustment.stockBefore,
    stockAfter: adjustment.stockAfter,
    note: adjustment.note ?? "",
    createdAt: adjustment.createdAt.toISOString(),
  };
}

const adjustmentInclude = {
  product: { select: { id: true, name: true, sku: true } },
} as const;

export class StockAdjustmentsRepository {
  async list(salonId: string, productId?: string) {
    const adjustments = await prisma.stockMovement.findMany({
      where: {
        salonId,
        ...(productId ? { productId } : {}),
      },
      include: adjustmentInclude,
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return adjustments.map(mapAdjustment);
  }

  async getById(salonId: string, adjustmentId: string) {
    const adjustment = await prisma.stockMovement.findFirst({
      where: {
        publicId: adjustmentId,
        salonId,
      },
      include: adjustmentInclude,
    });
    if (!adjustment) {
      throw new AppError(404, "Stock adjustment not found", {
        code: STOCK_ADJUSTMENT_ERROR_CODES.NOT_FOUND,
      });
    }
    return mapAdjustment(adjustment);
  }

  async create(auth: AuthContext, input: CreateStockAdjustmentInput) {
    const product = await prisma.product.findFirst({
      where: { id: input.productId, salonId: auth.salonId, deletedAt: null },
    });
    if (!product) {
      throw new AppError(404, "Product not found", {
        code: STOCK_ADJUSTMENT_ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    }

    const movementType =
      input.movementType === "service_used"
        ? MOVEMENT_TYPE.SERVICE_USED
        : MOVEMENT_TYPE.MANUAL_ADJUSTMENT;

    const adjustment = await prisma.$transaction(async (tx) => {
      const stockResult = await applyStockChange(tx, {
        salonId: auth.salonId,
        productId: input.productId,
        qtyChange: input.quantityChange,
        movementType,
        note: input.note,
      });

      const movement = await tx.stockMovement.findFirstOrThrow({
        where: {
          salonId: auth.salonId,
          productId: input.productId,
          movementType,
          stockBefore: stockResult.stockBefore,
          stockAfter: stockResult.stockAfter,
        },
        orderBy: { createdAt: "desc" },
        include: adjustmentInclude,
      });

      return { movement, stockResult };
    });

    notifyStockChangeResult(adjustment.stockResult);

    return mapAdjustment(adjustment.movement);
  }

  async update(auth: AuthContext, adjustmentId: string, input: UpdateStockAdjustmentInput) {
    const existing = await prisma.stockMovement.findFirst({
      where: {
        publicId: adjustmentId,
        salonId: auth.salonId,
        movementType: MOVEMENT_TYPE.MANUAL_ADJUSTMENT,
      },
    });
    if (!existing) {
      throw new AppError(404, "Stock adjustment not found", {
        code: STOCK_ADJUSTMENT_ERROR_CODES.NOT_FOUND,
      });
    }

    const adjustment = await prisma.stockMovement.update({
      where: { id: existing.id },
      data: {
        note: input.note === "" ? null : input.note,
      },
      include: adjustmentInclude,
    });
    return mapAdjustment(adjustment);
  }

  async delete(_auth: AuthContext, _adjustmentId: string) {
    throw new AppError(400, "Stock adjustment history cannot be deleted", {
      code: STOCK_ADJUSTMENT_ERROR_CODES.CANNOT_DELETE,
    });
  }
}

export const stockAdjustmentsRepository = new StockAdjustmentsRepository();
