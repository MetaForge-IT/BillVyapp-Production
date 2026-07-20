import { apiClient } from "../lib/axios";

export interface UploadedFile {
  key: string;
  url: string;
  storage: "s3" | "local";
}

interface UploadEnvelope {
  success: true;
  message: string;
  data: UploadedFile;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<UploadEnvelope>("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}
