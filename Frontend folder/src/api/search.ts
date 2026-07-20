import { apiClient } from "../lib/axios";

export interface SearchResult {
  type: string;
  label: string;
  href: string;
  meta: Record<string, unknown>;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function searchGlobal(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const { data } = await apiClient.get<ApiEnvelope<SearchResult[]>>("/search", {
    params: { q: query.trim() },
  });
  return data.data;
}
