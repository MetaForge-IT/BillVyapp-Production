import { apiClient } from "../lib/axios";

export interface StockPurchaseItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  quantityReceived: number;
  unitCost: number;
  lineTotal: number;
}

export interface StockPurchase {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  deliveredDate: string | null;
  totalAmount: number;
  notes: string;
  items: StockPurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStockPurchasePayload {
  vendorId: string;
  orderDate?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchStockPurchases(): Promise<StockPurchase[]> {
  const { data } = await apiClient.get<ApiEnvelope<StockPurchase[]>>("/stock-purchases");
  return data.data;
}

export async function fetchStockPurchase(purchaseId: string): Promise<StockPurchase> {
  const { data } = await apiClient.get<ApiEnvelope<StockPurchase>>(`/stock-purchases/${purchaseId}`);
  return data.data;
}

export async function createStockPurchase(
  payload: CreateStockPurchasePayload,
): Promise<StockPurchase> {
  const { data } = await apiClient.post<ApiEnvelope<StockPurchase>>("/stock-purchases", payload);
  return data.data;
}

export async function updateStockPurchase(
  purchaseId: string,
  payload: { notes?: string },
): Promise<StockPurchase> {
  const { data } = await apiClient.patch<ApiEnvelope<StockPurchase>>(
    `/stock-purchases/${purchaseId}`,
    payload,
  );
  return data.data;
}
