import type { AxiosResponse } from "axios";
import { apiClient } from "../lib/axios";
import type {
  AuthUser,
  LoginOtpChallengeResponse,
  LoginPayload,
  LoginResponse,
  LoginSuccessResponse,
  RefreshResponse,
  RegisterPayload,
  VerifyEmailResponse,
} from "../types/auth";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data?: T;
}

async function unwrap<T>(promise: Promise<AxiosResponse<ApiSuccessResponse<T>>>): Promise<ApiSuccessResponse<T>> {
  const { data } = await promise;
  return data;
}

export function register(payload: RegisterPayload) {
  return unwrap(apiClient.post<ApiSuccessResponse>("/auth/register", payload));
}

export function verifyEmail(payload: { email: string; otp: string } | { token: string }) {
  return unwrap<VerifyEmailResponse>(apiClient.post<ApiSuccessResponse<VerifyEmailResponse>>("/auth/verify-email", payload));
}

export function resendVerification(email: string) {
  return unwrap(apiClient.post<ApiSuccessResponse>("/auth/resend-verification", { email }));
}

export function login(payload: LoginPayload) {
  return unwrap<LoginResponse>(apiClient.post<ApiSuccessResponse<LoginResponse>>("/auth/login", payload));
}

export function verifyLoginOtp(payload: { challengeId: string; otp: string }) {
  return unwrap<LoginSuccessResponse>(
    apiClient.post<ApiSuccessResponse<LoginSuccessResponse>>("/auth/login/verify-otp", payload),
  );
}

export function resendLoginOtp(challengeId: string) {
  return unwrap<LoginOtpChallengeResponse>(
    apiClient.post<ApiSuccessResponse<LoginOtpChallengeResponse>>("/auth/login/resend-otp", {
      challengeId,
    }),
  );
}

export function logout() {
  return unwrap(apiClient.post<ApiSuccessResponse>("/auth/logout"));
}

export function refresh() {
  return unwrap<RefreshResponse>(apiClient.post<ApiSuccessResponse<RefreshResponse>>("/auth/refresh"));
}

export function getCurrentUser() {
  return unwrap<{ user: AuthUser }>(apiClient.get<ApiSuccessResponse<{ user: AuthUser }>>("/auth/me"));
}

export function forgotPassword(email: string) {
  return unwrap(apiClient.post<ApiSuccessResponse>("/auth/forgot-password", { email }));
}

export function resetPassword(token: string, newPassword: string) {
  return unwrap(apiClient.post<ApiSuccessResponse>("/auth/reset-password", { token, newPassword }));
}
