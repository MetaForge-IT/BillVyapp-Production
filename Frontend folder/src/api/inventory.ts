import { apiClient } from "../lib/axios";

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  stockStatus: string;
  retailPrice: number;
}

export interface TopRetailProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface InventoryStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  criticalCount: number;
  outOfStockCount: number;
  lowStockProducts: LowStockProduct[];
  topRetailProducts: TopRetailProduct[];
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchInventoryStats(): Promise<InventoryStats> {
  const { data } = await apiClient.get<ApiEnvelope<InventoryStats>>("/inventory/stats");
  return data.data;
}
