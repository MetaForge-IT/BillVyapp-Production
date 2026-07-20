import { create } from "zustand";
import * as authApi from "../api/auth";
import { clearAccessToken, getAccessToken, saveAccessToken } from "../lib/tokenStorage";

interface AuthState {
  isReady: boolean;
  isAuthenticated: boolean;
  bootstrap: () => Promise<void>;
  syncAuth: () => void;
  clearSession: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isReady: false,
  isAuthenticated: false,

  syncAuth: () => {
    set({ isAuthenticated: Boolean(getAccessToken()) });
  },

  clearSession: () => {
    clearAccessToken();
    set({ isAuthenticated: false });
  },

  bootstrap: async () => {
    try {
      if (!getAccessToken()) {
        try {
          const response = await authApi.refresh();
          if (response.data?.accessToken) {
            saveAccessToken(response.data.accessToken);
          }
        } catch {
          clearAccessToken();
        }
      }
    } finally {
      set({
        isAuthenticated: Boolean(getAccessToken()),
        isReady: true,
      });
    }
  },

  logout: async () => {
    // Clear local auth immediately to prevent other in-flight requests
    // from triggering /auth/refresh after cookies may already be cleared.
    clearAccessToken();
    set({ isAuthenticated: false });

    try {
      await authApi.logout();
    } catch {
      // Best-effort. If refresh cookie is already missing, we still consider
      // the user logged out locally.
    }
  },
}));
