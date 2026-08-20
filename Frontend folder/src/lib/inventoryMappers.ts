import type { ProductRecord } from "../api/products";
import type { StockAdjustment } from "../api/stock-adjustments";
import type { StockPurchase } from "../api/stock-purchases";
import type { Product, StockLog, StockLogType } from "../app/context/ProductsContext";

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function parseInr(value: string): number {
  return Number(value.replace(/[^\d.]/g, "")) || 0;
}

export function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function mapProductRecord(record: ProductRecord): Product {
  return {
    id: record.id,
    categoryId: record.categoryId,
    vendorId: record.vendorId ?? undefined,
    name: record.name,
    sku: record.sku,
    category: record.categoryName,
    brand: record.brand,
    stock: record.currentStock,
    minStock: record.minimumStock,
    price: formatInr(record.sellingPrice),
    costPrice: formatInr(record.purchasePrice),
    supplier: record.vendorName,
    status: record.stockStatus,
    activeStatus: record.status,
    lastOrder: formatDisplayDate(record.lastRestockedAt),
    barcode: record.barcode,
    unit: record.unit,
    gstRate: record.gstRate,
  };
}

const MOVEMENT_LABELS: Record<string, StockLogType> = {
  manual_adjustment: "Manual Adjustment",
  purchase_received: "Restock",
  service_used: "Service Used",
  retail_sale: "Retail Sale",
  bulk_import: "Bulk Import",
  initial_stock: "Bulk Import",
  restock: "Restock",
};

export function mapMovementType(type: string): StockLogType {
  return MOVEMENT_LABELS[type] ?? "Manual Adjustment";
}

export function mapStockAdjustmentToLog(adjustment: StockAdjustment): StockLog {
  const created = new Date(adjustment.createdAt);
  return {
    id: adjustment.id,
    productId: adjustment.productId,
    productName: adjustment.productName,
    sku: adjustment.sku,
    date: created.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: created.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    type: mapMovementType(adjustment.movementType),
    qtyChange: adjustment.quantityChange,
    stockBefore: adjustment.stockBefore,
    stockAfter: adjustment.stockAfter,
    note: adjustment.note,
  };
}

export interface PurchaseOrderRow {
  id: string;
  purchaseId: string;
  supplier: string;
  /** Total units ordered across all line items. */
  totalQuantity: number;
  /** Number of distinct product lines on the order. */
  lineCount: number;
  total: string;
  status: "pending" | "shipped" | "delivered";
  date: string;
  isVendorBill: boolean;
  raw: StockPurchase;
}

export function purchaseTotalQuantity(purchase: StockPurchase): number {
  return purchase.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function mapStockPurchaseToRow(purchase: StockPurchase): PurchaseOrderRow {
  const status =
    purchase.status === "received" ? "delivered"
    : purchase.status === "cancelled" ? "pending"
    : (purchase.status as PurchaseOrderRow["status"]);
  return {
    id: purchase.poNumber,
    purchaseId: purchase.id,
    supplier: purchase.vendorName,
    totalQuantity: purchaseTotalQuantity(purchase),
    lineCount: purchase.items.length,
    total: formatInr(purchase.totalAmount),
    status,
    date: formatDisplayDate(purchase.orderDate),
    isVendorBill: purchase.notes.toLowerCase().includes("vendor direct bill"),
    raw: purchase,
  };
}

export function parsePriceInput(value: string): number {
  const cleaned = value.replace(/[₹,\s]/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}
