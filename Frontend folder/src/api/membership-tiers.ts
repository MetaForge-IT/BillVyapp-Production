import { apiClient } from "../lib/axios";

export interface MembershipTier {
  id: string;
  name: string;
  slug: string;
  rank: number;
  price: number;
  durationMonths: number;
  discountPercent: number;
  pointsMultiplier: number;
  benefits: string;
  isActive: boolean;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchMembershipTiers(): Promise<MembershipTier[]> {
  const { data } = await apiClient.get<ApiEnvelope<MembershipTier[]>>("/membership-tiers");
  return data.data;
}
