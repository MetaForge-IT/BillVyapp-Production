import { apiClient } from "../lib/axios";

export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  sortOrder: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductCategoryPayload {
  name: string;
  description?: string;
  status?: "active" | "inactive";
  sortOrder?: number;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchProductCategories(): Promise<ProductCategory[]> {
  const { data } = await apiClient.get<ApiEnvelope<ProductCategory[]>>("/product-categories");
  return data.data;
}

export async function createProductCategory(
  payload: CreateProductCategoryPayload,
): Promise<ProductCategory> {
  const { data } = await apiClient.post<ApiEnvelope<ProductCategory>>("/product-categories", payload);
  return data.data;
}

export async function updateProductCategory(
  categoryId: string,
  payload: Partial<CreateProductCategoryPayload>,
): Promise<ProductCategory> {
  const { data } = await apiClient.patch<ApiEnvelope<ProductCategory>>(
    `/product-categories/${categoryId}`,
    payload,
  );
  return data.data;
}

export async function deleteProductCategory(categoryId: string): Promise<void> {
  await apiClient.delete(`/product-categories/${categoryId}`);
}
