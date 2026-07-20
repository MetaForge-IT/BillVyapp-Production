import { apiClient } from "../lib/axios";

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  sortOrder: number;
  serviceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceCategoryPayload {
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

export async function fetchServiceCategories(): Promise<ServiceCategory[]> {
  const { data } = await apiClient.get<ApiEnvelope<ServiceCategory[]>>("/service-categories");
  return data.data;
}

export async function createServiceCategory(
  payload: CreateServiceCategoryPayload,
): Promise<ServiceCategory> {
  const { data } = await apiClient.post<ApiEnvelope<ServiceCategory>>("/service-categories", payload);
  return data.data;
}

export async function updateServiceCategory(
  categoryId: string,
  payload: Partial<CreateServiceCategoryPayload>,
): Promise<ServiceCategory> {
  const { data } = await apiClient.patch<ApiEnvelope<ServiceCategory>>(
    `/service-categories/${categoryId}`,
    payload,
  );
  return data.data;
}

export async function deleteServiceCategory(categoryId: string): Promise<void> {
  await apiClient.delete(`/service-categories/${categoryId}`);
}
