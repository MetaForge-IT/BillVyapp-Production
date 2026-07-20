import { apiClient } from "../lib/axios";

export interface StaffMember {
  id: string;
  fullName: string;
  role: string;
  phone: string;
  avatarUrl: string;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchStaff(): Promise<StaffMember[]> {
  const { data } = await apiClient.get<ApiEnvelope<StaffMember[]>>("/staff");
  return data.data;
}
