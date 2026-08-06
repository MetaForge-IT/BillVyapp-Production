import { apiClient } from "../lib/axios";

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data?: T;
}

export async function sendCouponWhatsApp(payload: {
  phone: string;
  code: string;
  valueLabel: string;
  validUntil: string;
  customerName?: string;
}): Promise<void> {
  await apiClient.post<ApiEnvelope<{ queued: boolean }>>("/messaging/whatsapp/coupon", payload);
}

export async function sendFeedbackRequestWhatsApp(payload: {
  phone: string;
  customerName?: string;
  feedbackUrl?: string;
}): Promise<{ feedbackUrl: string }> {
  const { data } = await apiClient.post<ApiEnvelope<{ queued: boolean; feedbackUrl: string }>>(
    "/messaging/whatsapp/feedback-request",
    payload,
  );
  return { feedbackUrl: data.data?.feedbackUrl ?? "" };
}

export async function sendBirthdayOfferWhatsApp(payload: {
  phone: string;
  customerName: string;
  offerLabel: string;
  validUntil: string;
}): Promise<void> {
  await apiClient.post<ApiEnvelope<{ queued: boolean }>>(
    "/messaging/whatsapp/birthday-offer",
    payload,
  );
}
