import { apiClient } from "../lib/axios";

export type PlanType = "membership" | "package";
export type NamePreset = "basic" | "silver" | "gold" | "platinum" | "custom";

export interface PlanIncludedService {
  serviceId: string;
  serviceName: string;
  quantity: number;
}

export interface SalonPlan {
  id: string;
  name: string;
  namePreset: string | null;
  planType: PlanType;
  price: number;
  walletAmount: number | null;
  validityDays: number;
  serviceLimit: number | null;
  discountPercent: number | null;
  description: string | null;
  isActive: boolean;
  includedServices: PlanIncludedService[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanEnrollment {
  id: string;
  customerId: string;
  customer: string;
  phone: string;
  packageName: string;
  planType: PlanType;
  planId: string;
  status: "Active" | "Exhausted" | "Expired" | string;
  servicesTotal: number;
  servicesUsed: number;
  walletTotal: number;
  walletUsed: number;
  walletBalance: number;
  expiry: string;
  amountPaid: number;
  startDate: string;
}

export interface SalonServiceOption {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface CustomerOption {
  id: string;
  fullName: string;
  phone: string;
}

export interface CreatePlanPayload {
  namePreset: NamePreset;
  customName?: string;
  planType: PlanType;
  price: number;
  walletAmount?: number | null;
  validityDays: number;
  serviceLimit?: number | null;
  discountPercent?: number | null;
  description?: string | null;
  isActive?: boolean;
  includedServices?: { serviceId: string; quantity?: number }[];
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchPlanEnrollments(): Promise<PlanEnrollment[]> {
  const { data } = await apiClient.get<ApiEnvelope<PlanEnrollment[]>>("/plans/enrollments");
  return data.data;
}

export async function fetchSalonPlans(): Promise<SalonPlan[]> {
  const { data } = await apiClient.get<ApiEnvelope<SalonPlan[]>>("/plans");
  return data.data;
}

export async function createSalonPlan(payload: CreatePlanPayload): Promise<SalonPlan> {
  const { data } = await apiClient.post<ApiEnvelope<SalonPlan>>("/plans", payload);
  return data.data;
}

export async function enrollCustomerInPlan(payload: {
  customerId: string;
  planId: string;
  amountPaid?: number;
}): Promise<PlanEnrollment> {
  const { data } = await apiClient.post<ApiEnvelope<PlanEnrollment>>("/plans/enrollments", payload);
  return data.data;
}

export async function fetchPlanServices(): Promise<SalonServiceOption[]> {
  const { data } = await apiClient.get<ApiEnvelope<SalonServiceOption[]>>("/plans/services");
  return data.data;
}

export async function fetchPlanCustomers(): Promise<CustomerOption[]> {
  const { data } = await apiClient.get<ApiEnvelope<CustomerOption[]>>("/plans/customers");
  return data.data;
}

export async function updateSalonPlan(
  planId: string,
  payload: Partial<CreatePlanPayload> & { isActive?: boolean },
): Promise<SalonPlan> {
  const { data } = await apiClient.patch<ApiEnvelope<SalonPlan>>(`/plans/${planId}`, payload);
  return data.data;
}
