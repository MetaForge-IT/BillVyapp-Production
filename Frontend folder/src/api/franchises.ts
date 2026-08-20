import { apiClient } from "../lib/axios";

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export interface FranchiseSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  shopCount: number;
  userCount: number;
  admins: Array<{ id: string; fullName: string; email: string; phone: string | null }>;
  createdAt: string;
}

export interface FranchiseDetail {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  shops: Array<{
    id: string;
    name: string;
    displayName: string | null;
    code: string | null;
    email: string;
    phone: string;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    isActive: boolean;
  }>;
  staff: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: string;
    salonId: string | null;
    shopLabel: string;
    shopCity: string | null;
  }>;
  createdAt: string;
}

export interface PlatformOverview {
  franchises: number;
  shops: number;
  admins: number;
  managers: number;
  superAdmins: number;
}

export type PlatformRevenueRange = "today" | "7d" | "30d" | "mtd";

export interface PlatformRevenue {
  range: PlatformRevenueRange;
  from: string;
  to: string;
  totals: {
    revenue: number;
    billed: number;
    invoiceCount: number;
    shopCount: number;
    franchiseCount: number;
  };
  byFranchise: Array<{
    franchiseId: string;
    franchiseName: string;
    revenue: number;
    billed: number;
    invoiceCount: number;
    shopCount: number;
  }>;
  byShop: Array<{
    salonId: string;
    shopName: string;
    city: string | null;
    franchiseId: string;
    franchiseName: string;
    revenue: number;
    billed: number;
    invoiceCount: number;
  }>;
  dailyTrend: Array<{ date: string; revenue: number }>;
}

export interface StaffRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  franchiseId: string | null;
  franchiseName: string | null;
  salonId: string | null;
  shopLabel: string | null;
  shopCity: string | null;
}

export async function fetchPlatformOverview(): Promise<PlatformOverview> {
  const { data } = await apiClient.get<ApiEnvelope<PlatformOverview>>("/franchises/overview");
  return data.data;
}

export async function fetchPlatformRevenue(
  range: PlatformRevenueRange = "30d",
): Promise<PlatformRevenue> {
  const { data } = await apiClient.get<ApiEnvelope<PlatformRevenue>>("/franchises/revenue", {
    params: { range },
  });
  return data.data;
}

export async function fetchFranchises(): Promise<FranchiseSummary[]> {
  const { data } = await apiClient.get<ApiEnvelope<FranchiseSummary[]>>("/franchises");
  return data.data;
}

export async function fetchFranchise(id: string): Promise<FranchiseDetail> {
  const { data } = await apiClient.get<ApiEnvelope<FranchiseDetail>>(`/franchises/${id}`);
  return data.data;
}

export async function createFranchise(payload: {
  name: string;
  slug: string;
  isActive?: boolean;
  admin: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
  };
}): Promise<FranchiseSummary> {
  const { data } = await apiClient.post<ApiEnvelope<FranchiseSummary>>("/franchises", payload);
  return data.data;
}

export async function createShop(
  franchiseId: string,
  payload: {
    name: string;
    displayName?: string;
    code?: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  },
) {
  const { data } = await apiClient.post(`/franchises/${franchiseId}/shops`, payload);
  return data.data;
}

export async function fetchPlatformStaff(): Promise<StaffRow[]> {
  const { data } = await apiClient.get<ApiEnvelope<StaffRow[]>>("/franchises/staff");
  return data.data;
}

export async function createPlatformStaff(payload: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: "admin" | "manager";
  franchiseId: string;
  /** Required for managers; optional for franchise admins. */
  salonId?: string | null;
}) {
  const { data } = await apiClient.post("/franchises/staff", payload);
  return data.data;
}

/** Franchise admin — scoped to the signed-in admin's franchise. */
export interface MyFranchiseDetail {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  shops: Array<{
    id: string;
    name: string;
    displayName: string | null;
    code: string | null;
    email: string;
    phone: string;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    isActive: boolean;
  }>;
  staff: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: string;
    salonId: string | null;
    shopLabel: string;
    shopCity: string | null;
  }>;
  managers: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    salonId: string | null;
    shopLabel: string;
    shopCity: string | null;
    shopAddress?: string | null;
    shopState?: string | null;
    shopPincode?: string | null;
  }>;
  createdAt: string;
}

export async function fetchMyFranchise(): Promise<MyFranchiseDetail> {
  const { data } = await apiClient.get<ApiEnvelope<MyFranchiseDetail>>("/my-franchise");
  return data.data;
}

export async function createFranchiseManager(payload: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  salonId: string;
}) {
  const { data } = await apiClient.post<ApiEnvelope<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    salonId: string | null;
    shopLabel: string;
  }>>("/my-franchise/managers", payload);
  return data.data;
}

export async function createMyFranchiseShop(payload: {
  name: string;
  displayName?: string;
  code?: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}) {
  const { data } = await apiClient.post<ApiEnvelope<MyFranchiseDetail["shops"][number]>>(
    "/my-franchise/shops",
    payload,
  );
  return data.data;
}

export async function updateMyFranchiseShop(
  shopId: string,
  payload: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    displayName?: string;
  },
) {
  const { data } = await apiClient.patch<ApiEnvelope<MyFranchiseDetail["shops"][number]>>(
    `/my-franchise/shops/${shopId}`,
    payload,
  );
  return data.data;
}
