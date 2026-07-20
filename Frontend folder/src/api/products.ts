import { apiClient } from "../lib/axios";

export interface ProductRecord {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  brand: string;
  vendorId: string | null;
  vendorName: string;
  barcode: string;
  sku: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: number | null;
  currentStock: number;
  minimumStock: number;
  unit: string;
  stockStatus: string;
  status: "active" | "inactive";
  lastRestockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  categoryId: string;
  brand?: string;
  vendorId?: string;
  barcode?: string;
  sku: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate?: number;
  currentStock?: number;
  minimumStock?: number;
  unit?: string;
  status?: "active" | "inactive";
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchProducts(params?: {
  categoryId?: string;
  status?: string;
  stockStatus?: string;
  search?: string;
}): Promise<ProductRecord[]> {
  const { data } = await apiClient.get<ApiEnvelope<ProductRecord[]>>("/products", { params });
  return data.data;
}

export async function fetchProduct(productId: string): Promise<ProductRecord> {
  const { data } = await apiClient.get<ApiEnvelope<ProductRecord>>(`/products/${productId}`);
  return data.data;
}

export async function createProduct(payload: CreateProductPayload): Promise<ProductRecord> {
  const { data } = await apiClient.post<ApiEnvelope<ProductRecord>>("/products", payload);
  return data.data;
}

export async function updateProduct(
  productId: string,
  payload: Partial<CreateProductPayload>,
): Promise<ProductRecord> {
  const { data } = await apiClient.patch<ApiEnvelope<ProductRecord>>(
    `/products/${productId}`,
    payload,
  );
  return data.data;
}

export async function deleteProduct(productId: string): Promise<void> {
  await apiClient.delete(`/products/${productId}`);
}
