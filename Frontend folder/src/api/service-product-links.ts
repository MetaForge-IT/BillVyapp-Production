import { apiClient } from "../lib/axios";

export interface ServiceProductLinkDto {
  id?: string;
  serviceId?: string;
  productId?: string | null;
  sku: string;
  name: string;
  defaultQty: number;
  unit: string;
  wasteBuffer: number;
  minQty: number;
  maxQty: number;
}

export interface ServiceProductLinkGroup {
  serviceId: string;
  serviceName: string;
  links: ServiceProductLinkDto[];
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchServiceProductLinks(
  serviceId?: string,
): Promise<ServiceProductLinkGroup[] | ServiceProductLinkGroup> {
  const { data } = await apiClient.get<ApiEnvelope<ServiceProductLinkGroup[] | ServiceProductLinkGroup>>(
    "/service-product-links",
    { params: serviceId ? { serviceId } : undefined },
  );
  return data.data;
}

export async function replaceServiceProductLinks(
  serviceId: string,
  links: Omit<ServiceProductLinkDto, "id" | "serviceId">[],
): Promise<ServiceProductLinkGroup> {
  const { data } = await apiClient.put<ApiEnvelope<ServiceProductLinkGroup>>(
    `/service-product-links/${serviceId}`,
    { links },
  );
  return data.data;
}
