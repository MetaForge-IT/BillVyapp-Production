import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchProducts } from "../../api/products";
import { createStockAdjustment, fetchStockAdjustments } from "../../api/stock-adjustments";
import { getApiErrorMessage } from "../../lib/api";
import { mapProductRecord, mapStockAdjustmentToLog } from "../../lib/inventoryMappers";

export type Product = {
  id: string;
  categoryId: string;
  vendorId?: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  stock: number;
  minStock: number;
  price: string;
  costPrice: string;
  supplier: string;
  status: string;
  activeStatus?: "active" | "inactive";
  lastOrder: string;
  barcode?: string;
  unit?: string;
  gstRate?: number | null;
};

export type StockLogType =
  | "Service Used"
  | "Retail Sale"
  | "Manual Adjustment"
  | "Restock"
  | "Bulk Import";

export type StockLog = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  date: string;
  time: string;
  type: StockLogType;
  qtyChange: number;
  stockBefore: number;
  stockAfter: number;
  ref?: string;
  note?: string;
};

type ProductsContextValue = {
  products: Product[];
  stockLog: StockLog[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setStockLog: React.Dispatch<React.SetStateAction<StockLog[]>>;
  deductBySku: (
    sku: string,
    qty: number,
    type: StockLogType,
    ref?: string,
    note?: string,
  ) => Promise<boolean>;
  deductByName: (
    name: string,
    qty: number,
    type: StockLogType,
    ref?: string,
    note?: string,
  ) => Promise<boolean>;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);

function movementTypeForLog(type: StockLogType): "manual_adjustment" | "service_used" {
  return type === "Service Used" ? "service_used" : "manual_adjustment";
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLog, setStockLog] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productRows, movements] = await Promise.all([
        fetchProducts(),
        fetchStockAdjustments(),
      ]);
      setProducts(productRows.map(mapProductRecord));
      setStockLog(movements.map(mapStockAdjustmentToLog));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load inventory"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyStockChangeByProduct = useCallback(async (
    product: Product,
    qty: number,
    type: StockLogType,
    ref?: string,
    note?: string,
  ): Promise<boolean> => {
    const quantityChange = -qty;
    if (quantityChange === 0) return true;

    const noteParts = [note, ref].filter(Boolean);
    try {
      await createStockAdjustment({
        productId: product.id,
        quantityChange,
        movementType: movementTypeForLog(type),
        note: noteParts.length > 0 ? noteParts.join(" · ") : undefined,
      });
      await refresh();
      return true;
    } catch {
      return false;
    }
  }, [refresh]);

  const deductBySku = useCallback(async (
    sku: string,
    qty: number,
    type: StockLogType,
    ref?: string,
    note?: string,
  ): Promise<boolean> => {
    const product = products.find((p) => p.sku.toUpperCase() === sku.toUpperCase());
    if (!product) return false;
    return applyStockChangeByProduct(product, qty, type, ref, note);
  }, [products, applyStockChangeByProduct]);

  const deductByName = useCallback(async (
    name: string,
    qty: number,
    type: StockLogType,
    ref?: string,
    note?: string,
  ): Promise<boolean> => {
    const lower = name.toLowerCase();
    const product = products.find((p) => p.name.toLowerCase().includes(lower));
    if (!product) return false;
    return applyStockChangeByProduct(product, qty, type, ref, note);
  }, [products, applyStockChangeByProduct]);

  return (
    <ProductsContext.Provider
      value={{
        products,
        stockLog,
        loading,
        error,
        refresh,
        setProducts,
        setStockLog,
        deductBySku,
        deductByName,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used inside ProductsProvider");
  return ctx;
}
