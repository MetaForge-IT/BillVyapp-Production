import { apiClient } from "../lib/axios";

export interface VendorRecord {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  paymentTerms: string;
  status: "active" | "inactive";
  productCount: number;
  purchaseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorPayload {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  paymentTerms?: string;
  status?: "active" | "inactive";
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchVendors(): Promise<VendorRecord[]> {
  const { data } = await apiClient.get<ApiEnvelope<VendorRecord[]>>("/vendors");
  return data.data;
}

export async function fetchVendor(vendorId: string): Promise<VendorRecord> {
  const { data } = await apiClient.get<ApiEnvelope<VendorRecord>>(`/vendors/${vendorId}`);
  return data.data;
}

export async function createVendor(payload: CreateVendorPayload): Promise<VendorRecord> {
  const { data } = await apiClient.post<ApiEnvelope<VendorRecord>>("/vendors", payload);
  return data.data;
}

export async function updateVendor(
  vendorId: string,
  payload: Partial<CreateVendorPayload>,
): Promise<VendorRecord> {
  const { data } = await apiClient.patch<ApiEnvelope<VendorRecord>>(
    `/vendors/${vendorId}`,
    payload,
  );
  return data.data;
}

export async function deleteVendor(vendorId: string): Promise<void> {
  await apiClient.delete(`/vendors/${vendorId}`);
}
