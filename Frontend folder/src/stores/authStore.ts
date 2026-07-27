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

  /**
   * Restore session on hard refresh.
   * - Prefer silently rotating via httpOnly refresh cookie.
   * - If refresh fails but an access token still exists, keep the user logged in
   *   (do not auto-logout). Token validity is checked on the next API call.
   */
  bootstrap: async () => {
    try {
      const existing = getAccessToken();

      try {
        const response = await authApi.refresh();
        if (response.data?.accessToken) {
          saveAccessToken(response.data.accessToken);
        }
      } catch {
        // No usable refresh cookie — keep existing access token if present.
        if (!existing) {
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
