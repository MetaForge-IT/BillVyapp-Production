import { apiClient } from "../lib/axios";

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  movementType: string;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  note: string;
  createdAt: string;
}

export interface CreateStockAdjustmentPayload {
  productId: string;
  quantityChange: number;
  note?: string;
  movementType?: "manual_adjustment" | "service_used";
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchStockAdjustments(productId?: string): Promise<StockAdjustment[]> {
  const { data } = await apiClient.get<ApiEnvelope<StockAdjustment[]>>("/stock-adjustments", {
    params: productId ? { productId } : undefined,
  });
  return data.data;
}

export async function createStockAdjustment(
  payload: CreateStockAdjustmentPayload,
): Promise<StockAdjustment> {
  const { data } = await apiClient.post<ApiEnvelope<StockAdjustment>>("/stock-adjustments", payload);
  return data.data;
}
