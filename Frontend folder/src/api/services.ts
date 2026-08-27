import { apiClient } from "../lib/axios";
import { LIST_WORKING_LIMIT } from "../lib/pagination";

export type ServiceGender = "MALE" | "FEMALE" | "UNISEX";

export interface CatalogService {
  id: string;
  name: string;
  displayName?: string;
  serviceGroup?: string | null;
  serviceCode?: string;
  price: number;
  memberPrice: number;
  duration?: number;
  category?: string;
  categoryId?: string;
  tax?: number | null;
  gender?: ServiceGender;
  /** @deprecated use gender — kept for older clients */
  tag?: "Male" | "Female";
}

export interface ServiceRecord {
  id: string;
  salonId?: string;
  salonName?: string | null;
  serviceCode: string;
  name: string;
  displayName: string;
  serviceGroup: string | null;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string | null;
  description: string;
  duration: number;
  price: number;
  memberPrice: number | null;
  tax: number | null;
  gender: ServiceGender;
  popularity: number;
  sortOrder: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface ServiceListResponse {
  items: ServiceRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateServicePayload {
  name?: string;
  displayName?: string;
  serviceCode?: string;
  categoryId: string;
  serviceGroup?: string | null;
  description?: string;
  duration: number;
  price: number;
  tax?: number;
  popularity?: number;
  sortOrder?: number;
  gender?: ServiceGender;
  status?: "active" | "inactive";
  memberPrice?: number;
  salonId?: string;
}

export interface ListServicesParams {
  gender?: ServiceGender;
  categoryId?: string;
  serviceGroup?: string;
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
  salonId?: string;
  sort?: "sortOrder" | "name" | "displayName" | "price" | "createdAt" | "popularity";
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

export async function fetchServices(params: ListServicesParams = {}): Promise<ServiceListResponse> {
  const { data } = await apiClient.get<ApiEnvelope<ServiceListResponse>>("/services", {
    params: {
      ...params,
      active: params.active === undefined ? undefined : params.active ? "true" : "false",
    },
  });
  return data.data;
}

/** Load every service page (API max limit is 200 per request). */
export async function fetchAllServices(
  params: Omit<ListServicesParams, "page" | "limit"> = {},
): Promise<ServiceRecord[]> {
  const limit = LIST_WORKING_LIMIT;
  const first = await fetchServices({ ...params, page: 1, limit });
  if (first.totalPages <= 1) return first.items;

  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, i) =>
      fetchServices({ ...params, page: i + 2, limit }),
    ),
  );
  return [...first.items, ...rest.flatMap((page) => page.items)];
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
