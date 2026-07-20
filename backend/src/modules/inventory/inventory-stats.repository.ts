import { prisma } from "../../config/prisma";
import { STOCK_STATUS } from "./inventory.shared";

export class InventoryStatsRepository {
  async getStats(salonId: string) {
    const products = await prisma.product.findMany({
      where: { salonId, deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQty: true,
        minStockQty: true,
        stockStatus: true,
        costPrice: true,
        retailPrice: true,
      },
      orderBy: [{ stockStatus: "desc" }, { stockQty: "asc" }, { name: "asc" }],
    });

    const totalProducts = products.length;
    const totalStockValue = products.reduce(
      (sum, product) => sum + product.stockQty * Number(product.costPrice),
      0,
    );
    const lowStockCount = products.filter((p) => p.stockStatus === STOCK_STATUS.LOW).length;
    const criticalCount = products.filter((p) => p.stockStatus === STOCK_STATUS.CRITICAL).length;
    const outOfStockCount = products.filter((p) => p.stockStatus === STOCK_STATUS.OUT).length;

    const lowStockProducts = products
      .filter(
        (p) =>
          p.stockStatus === STOCK_STATUS.LOW ||
          p.stockStatus === STOCK_STATUS.CRITICAL ||
          p.stockStatus === STOCK_STATUS.OUT,
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stockQty,
        minStock: p.minStockQty,
        stockStatus: p.stockStatus,
        retailPrice: Number(p.retailPrice),
      }));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const retailLines = await prisma.invoiceLineItem.findMany({
      where: {
        lineType: "product",
        productId: { not: null },
        invoice: {
          salonId,
          voidedAt: null,
          invoiceDate: { gte: thirtyDaysAgo },
          status: { in: ["paid", "partially_paid"] },
        },
      },
      select: {
        productId: true,
        itemName: true,
        quantity: true,
        lineTotal: true,
      },
    });

    const retailAgg = new Map<string, { name: string; quantitySold: number; revenue: number }>();
    for (const line of retailLines) {
      if (!line.productId) continue;
      const existing = retailAgg.get(line.productId) ?? {
        name: line.itemName,
        quantitySold: 0,
        revenue: 0,
      };
      existing.quantitySold += line.quantity;
      existing.revenue += Number(line.lineTotal);
      retailAgg.set(line.productId, existing);
    }

    const topRetailProducts = Array.from(retailAgg.entries())
      .map(([productId, stats]) => ({ productId, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalProducts,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      lowStockCount,
      criticalCount,
      outOfStockCount,
      lowStockProducts,
      topRetailProducts,
    };
  }
}

export const inventoryStatsRepository = new InventoryStatsRepository();
