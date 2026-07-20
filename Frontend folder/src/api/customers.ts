import { apiClient } from "../lib/axios";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  gender: "male" | "female" | "other";
  membershipTier: string;
  loyaltyPoints: number;
  totalVisits: number;
  totalSpend: number;
  lastVisitDate: string;
  lastVisit: string;
  favoriteService: string;
  preferredStaff: string;
  birthday: string;
  satisfaction: number;
  joinDate: string;
  address?: string;
  notes?: string;
  gstin?: string;
  status: "active" | "inactive";
}

export interface CreateCustomerPayload {
  fullName: string;
  phone: string;
  email?: string;
  gender?: "male" | "female" | "other";
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  gstin?: string;
  status?: "active" | "inactive";
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data } = await apiClient.get<ApiEnvelope<Customer[]>>("/customers");
  return data.data;
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
  const { data } = await apiClient.post<ApiEnvelope<Customer>>("/customers", payload);
  return data.data;
}

export async function updateCustomer(
  customerId: string,
  payload: Partial<CreateCustomerPayload>,
): Promise<Customer> {
  const { data } = await apiClient.patch<ApiEnvelope<Customer>>(
    `/customers/${customerId}`,
    payload,
  );
  return data.data;
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await apiClient.delete(`/customers/${customerId}`);
}

export interface CustomerVisit {
  type: "appointment" | "invoice";
  id: string;
  date: string;
  label: string;
  amount: number;
  meta: Record<string, unknown>;
}

export interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  balanceAfter: number;
  note: string;
  invoiceId: string | null;
  createdAt: string;
}

export interface CustomerLoyalty {
  loyaltyPoints: number;
  transactions: LoyaltyTransaction[];
}

export async function fetchCustomerVisits(customerId: string): Promise<CustomerVisit[]> {
  const { data } = await apiClient.get<ApiEnvelope<CustomerVisit[]>>(
    `/customers/${customerId}/visits`,
  );
  return data.data;
}

export async function fetchCustomerLoyalty(customerId: string): Promise<CustomerLoyalty> {
  const { data } = await apiClient.get<ApiEnvelope<CustomerLoyalty>>(
    `/customers/${customerId}/loyalty`,
  );
  return data.data;
}

export async function redeemLoyaltyPoints(
  customerId: string,
  points: number,
): Promise<{ loyaltyPoints: number; transaction: LoyaltyTransaction }> {
  const { data } = await apiClient.post<
    ApiEnvelope<{ loyaltyPoints: number; transaction: LoyaltyTransaction }>
  >(`/customers/${customerId}/loyalty/redeem`, { points });
  return data.data;
}
