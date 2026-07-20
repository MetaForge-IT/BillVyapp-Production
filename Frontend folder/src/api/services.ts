import { apiClient } from "../lib/axios";

export interface CatalogService {
  id: string;
  name: string;
  price: number;
  memberPrice: number;
  duration?: number;
  category?: string;
  tax?: number | null;
  tag?: "Male" | "Female";
}

export interface ServiceRecord {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  duration: number;
  price: number;
  memberPrice: number | null;
  tax: number | null;
  popularity: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface CreateServicePayload {
  name: string;
  categoryId: string;
  description?: string;
  duration: number;
  price: number;
  tax?: number;
  popularity?: number;
  status?: "active" | "inactive";
  memberPrice?: number;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchServiceCatalog(): Promise<CatalogService[]> {
  const { data } = await apiClient.get<ApiEnvelope<CatalogService[]>>("/services/catalog");
  return data.data;
}

export async function fetchServices(): Promise<ServiceRecord[]> {
  const { data } = await apiClient.get<ApiEnvelope<ServiceRecord[]>>("/services");
  return data.data;
}

export async function createService(payload: CreateServicePayload): Promise<ServiceRecord> {
  const { data } = await apiClient.post<ApiEnvelope<ServiceRecord>>("/services", payload);
  return data.data;
}

export async function updateService(
  serviceId: string,
  payload: Partial<CreateServicePayload>,
): Promise<ServiceRecord> {
  const { data } = await apiClient.patch<ApiEnvelope<ServiceRecord>>(
    `/services/${serviceId}`,
    payload,
  );
  return data.data;
}

export async function deleteService(serviceId: string): Promise<void> {
  await apiClient.delete(`/services/${serviceId}`);
}
