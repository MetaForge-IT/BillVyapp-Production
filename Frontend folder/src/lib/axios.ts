import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { ApiError } from "./api";
import { clearAccessToken, getAccessToken, saveAccessToken } from "./tokenStorage";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

interface ApiErrorBody {
  success?: false;
  message?: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}

interface RefreshResponseBody {
  success: true;
  message: string;
  data: {
    accessToken: string;
    expiresIn: number;
    tokenType: string;
  };
}

const AUTH_PATHS_WITHOUT_RETRY = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/resend-verification",
];

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processRefreshQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error);
      return;
    }
    resolve(token);
  });
  refreshQueue = [];
}

function shouldSkipRefreshRetry(url?: string): boolean {
  if (!url) return true;
  return AUTH_PATHS_WITHOUT_RETRY.some((path) => url.includes(path));
}

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  const statusCode = error.response?.status ?? 500;
  const body = error.response?.data;

  return new ApiError(
    body?.message ?? error.message ?? "Request failed",
    statusCode,
    body?.code,
    body?.errors,
  );
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefreshRetry(originalRequest.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post<RefreshResponseBody>("/auth/refresh");
        const newToken = data.data.accessToken;
        saveAccessToken(newToken);
        processRefreshQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError, null);
        clearAccessToken();
        return Promise.reject(
          refreshError instanceof AxiosError ? toApiError(refreshError) : refreshError,
        );
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(toApiError(error));
  },
);

export { API_BASE_URL };
