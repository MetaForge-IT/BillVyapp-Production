import { apiClient } from "../lib/axios";

export interface AdvanceRecord {
  id: string;
  customerId: string | null;
  customer: string;
  phone: string;
  service: string;
  amount: number;
  used: number;
  balance: number;
  date: string;
  bookedFor: string | null;
  source: string;
}

export interface CreateAdvancePayload {
  customerId?: string;
  customerName: string;
  phone: string;
  service?: string;
  amount: number;
  bookedFor?: string;
  source?: string;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchAdvances(): Promise<AdvanceRecord[]> {
  const { data } = await apiClient.get<ApiEnvelope<AdvanceRecord[]>>("/advances");
  return data.data;
}

export async function createAdvance(payload: CreateAdvancePayload): Promise<AdvanceRecord> {
  const { data } = await apiClient.post<ApiEnvelope<AdvanceRecord>>("/advances", payload);
  return data.data;
}

export async function deductAdvance(advanceId: string, amount: number): Promise<AdvanceRecord> {
  const { data } = await apiClient.patch<ApiEnvelope<AdvanceRecord>>(
    `/advances/${advanceId}/deduct`,
    { amount },
  );
  return data.data;
}
