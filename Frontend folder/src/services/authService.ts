import * as authApi from "../api/auth";
import { clearAccessToken, getAccessToken, saveAccessToken } from "../lib/tokenStorage";
import { useAuthStore } from "../stores/authStore";
import type { AuthUser, LoginPayload, RegisterPayload } from "../types/auth";
import { isLoginOtpChallenge } from "../types/auth";

export type { AuthUser, LoginPayload, RegisterPayload } from "../types/auth";
export { getAccessToken, clearAccessToken } from "../lib/tokenStorage";

export const authService = {
  async register(payload: RegisterPayload) {
    return authApi.register(payload);
  },

  async verifyEmail(email: string, otp: string) {
    return authApi.verifyEmail({ email, otp });
  },

  async verifyEmailByToken(token: string) {
    return authApi.verifyEmail({ token });
  },

  async resendVerification(email: string) {
    return authApi.resendVerification(email);
  },

  async login(payload: LoginPayload) {
    const response = await authApi.login(payload);

    // Password step only — tokens are issued after OTP verification.
    if (response.data && !isLoginOtpChallenge(response.data) && response.data.accessToken) {
      saveAccessToken(response.data.accessToken);
      useAuthStore.getState().syncAuth();
    }

    return response;
  },

  async verifyLoginOtp(challengeId: string, otp: string) {
    const response = await authApi.verifyLoginOtp({ challengeId, otp });

    if (response.data?.accessToken) {
      saveAccessToken(response.data.accessToken);
      useAuthStore.getState().syncAuth();
    }

    return response;
  },

  async resendLoginOtp(challengeId: string) {
    return authApi.resendLoginOtp(challengeId);
  },

  async logout() {
    await useAuthStore.getState().logout();
  },

  async refresh() {
    const response = await authApi.refresh();

    if (response.data?.accessToken) {
      saveAccessToken(response.data.accessToken);
      useAuthStore.getState().syncAuth();
    }

    return response;
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!getAccessToken()) {
      return null;
    }

    try {
      const response = await authApi.getCurrentUser();
      return response.data?.user ?? null;
    } catch {
      useAuthStore.getState().clearSession();
      return null;
    }
  },

  async forgotPassword(email: string) {
    return authApi.forgotPassword(email);
  },

  async resetPassword(token: string, newPassword: string) {
    return authApi.resetPassword(token, newPassword);
  },

  isAuthenticated(): boolean {
    return Boolean(getAccessToken());
  },
};

export const {
  register,
  verifyEmail,
  verifyEmailByToken,
  resendVerification,
  login,
  verifyLoginOtp,
  resendLoginOtp,
  logout,
  refresh,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  isAuthenticated,
} = authService;
