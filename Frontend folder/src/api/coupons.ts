import { apiClient } from "../lib/axios";

export type CouponType = "percentage" | "flat";
export type CouponStatus = "active" | "expired" | "disabled";

export interface ApiCoupon {
  id: string;
  salonId?: string;
  salonName?: string | null;
  code: string;
  title: string;
  description: string;
  type: CouponType;
  value: number;
  minSpend: number;
  maxDiscount?: number;
  validFrom: string;
  validTill: string;
  usageLimit: number;
  usedCount: number;
  status: CouponStatus;
  applicableTo: string;
}

export interface CreateCouponPayload {
  code: string;
  title: string;
  description?: string;
  type: CouponType;
  value: number;
  minSpend?: number;
  maxDiscount?: number;
  validFrom: string;
  validTill: string;
  usageLimit?: number;
  applicableTo?: string;
  status?: CouponStatus;
  /** Franchise admin: assign coupon to a shop. */
  salonId?: string;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchCoupons(params?: {
  status?: CouponStatus;
  salonId?: string;
}): Promise<ApiCoupon[]> {
  const { data } = await apiClient.get<ApiEnvelope<ApiCoupon[]>>("/coupons", {
    params: params?.status || params?.salonId ? params : undefined,
  });
  return data.data;
}

export async function createCoupon(payload: CreateCouponPayload): Promise<ApiCoupon> {
  const { data } = await apiClient.post<ApiEnvelope<ApiCoupon>>("/coupons", payload);
  return data.data;
}

export async function updateCoupon(
  couponId: string,
  payload: Partial<CreateCouponPayload>,
): Promise<ApiCoupon> {
  const { data } = await apiClient.patch<ApiEnvelope<ApiCoupon>>(`/coupons/${couponId}`, payload);
  return data.data;
}

export async function deleteCoupon(couponId: string): Promise<void> {
  await apiClient.delete(`/coupons/${couponId}`);
}
