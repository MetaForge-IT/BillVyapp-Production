import { apiClient } from "../lib/axios";

export type FeedbackSentiment = "positive" | "neutral" | "negative";
export type FeedbackStatus = "new" | "reviewed" | "resolved";
export type FeedbackSource = "google" | "app" | "sms";

export interface FeedbackItem {
  id: string;
  customerId: string;
  customer: string;
  appointmentId?: string;
  service: string;
  staff: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  date: string;
  feedbackDate: string;
  sentiment: FeedbackSentiment;
  status: FeedbackStatus;
  replied: boolean;
  replyText?: string;
  source: FeedbackSource;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackStats {
  averageRating: number;
  satisfactionPercent: number;
  totalReviews: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  unrepliedCount: number;
  newCount: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchFeedback(filters?: {
  rating?: number;
  ratingRange?: "1-2";
  status?: FeedbackStatus;
  search?: string;
}): Promise<FeedbackItem[]> {
  const params: Record<string, string> = {};
  if (filters?.rating) params.rating = String(filters.rating);
  if (filters?.ratingRange) params.ratingRange = filters.ratingRange;
  if (filters?.status) params.status = filters.status;
  if (filters?.search) params.search = filters.search;

  const { data } = await apiClient.get<ApiEnvelope<FeedbackItem[]>>("/feedback", { params });
  return data.data;
}

export async function fetchFeedbackStats(): Promise<FeedbackStats> {
  const { data } = await apiClient.get<ApiEnvelope<FeedbackStats>>("/feedback/stats");
  return data.data;
}

export async function fetchFeedbackById(feedbackId: string): Promise<FeedbackItem> {
  const { data } = await apiClient.get<ApiEnvelope<FeedbackItem>>(`/feedback/${feedbackId}`);
  return data.data;
}

export async function createFeedback(payload: {
  appointmentId: string;
  rating: number;
  comment?: string;
  source?: FeedbackSource;
}): Promise<FeedbackItem> {
  const { data } = await apiClient.post<ApiEnvelope<FeedbackItem>>("/feedback", payload);
  return data.data;
}

export async function updateFeedback(
  feedbackId: string,
  payload: { status?: FeedbackStatus; replyText?: string },
): Promise<FeedbackItem> {
  const { data } = await apiClient.patch<ApiEnvelope<FeedbackItem>>(
    `/feedback/${feedbackId}`,
    payload,
  );
  return data.data;
}

export async function deleteFeedback(feedbackId: string): Promise<void> {
  await apiClient.delete(`/feedback/${feedbackId}`);
}
