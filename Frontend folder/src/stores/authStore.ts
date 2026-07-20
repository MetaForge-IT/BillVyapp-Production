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
    try {
      await authApi.logout();
    } catch {
      /* server logout is best-effort; local session must still be cleared */
    } finally {
      clearAccessToken();
      set({ isAuthenticated: false });
    }
  },
}));
