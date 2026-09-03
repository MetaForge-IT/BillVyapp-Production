import { apiClient } from "../lib/axios";

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export type CampaignOfferType = "percentage" | "flat";
export type CampaignScope = "all_services" | "selected_services";
export type CampaignStatus = "draft" | "sending" | "completed" | "failed";

export interface CampaignServiceRef {
  id: string;
  name: string;
  displayName: string;
}

export interface Campaign {
  id: string;
  salonId: string;
  salonName: string;
  title: string;
  description: string;
  offerType: CampaignOfferType;
  offerValue: number;
  applicableScope: CampaignScope;
  serviceIds: string[];
  services: CampaignServiceRef[];
  validFrom: string;
  validTill: string;
  status: CampaignStatus;
  generateCoupon: boolean;
  couponId: string | null;
  couponCode: string | null;
  sentCount: number;
  failedCount: number;
  sentAt: string | null;
  audienceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  salonId?: string;
  title: string;
  description?: string;
  offerType: CampaignOfferType;
  offerValue: number;
  applicableScope: CampaignScope;
  serviceIds?: string[];
  validFrom: string;
  validTill: string;
  generateCoupon?: boolean;
}

export interface ListCampaignsParams {
  salonId?: string;
  status?: string;
}

export async function fetchCampaigns(params: ListCampaignsParams = {}): Promise<Campaign[]> {
  const { data } = await apiClient.get<ApiEnvelope<Campaign[]>>("/campaigns", { params });
  return data.data;
}

export async function fetchCampaign(campaignId: string, salonId?: string): Promise<Campaign> {
  const { data } = await apiClient.get<ApiEnvelope<Campaign>>(`/campaigns/${campaignId}`, {
    params: salonId ? { salonId } : undefined,
  });
  return data.data;
}

export async function createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
  const { data } = await apiClient.post<ApiEnvelope<Campaign>>("/campaigns", payload);
  return data.data;
}

export async function sendCampaign(campaignId: string, salonId?: string): Promise<Campaign> {
  const { data } = await apiClient.post<ApiEnvelope<Campaign>>(
    `/campaigns/${campaignId}/send`,
    {},
    { params: salonId ? { salonId } : undefined },
  );
  return data.data;
}

export async function deleteCampaign(campaignId: string, salonId?: string): Promise<void> {
  await apiClient.delete(`/campaigns/${campaignId}`, {
    params: salonId ? { salonId } : undefined,
  });
}
