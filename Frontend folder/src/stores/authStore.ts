import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as authApi from "../api/auth";

/** Legacy raw JWT key — migrated into the Zustand persist blob once. */
const LEGACY_TOKEN_KEY = "salon_access_token";
const AUTH_PERSIST_KEY = "salon-auth";

interface AuthState {
  accessToken: string | null;
  isReady: boolean;
  isAuthenticated: boolean;

  setAccessToken: (token: string | null) => void;
  /** @deprecated Prefer setAccessToken — kept for LoginPage / AuthContext callers. */
  syncAuth: () => void;
  clearSession: () => void;
  bootstrap: () => Promise<void>;
  logout: () => Promise<void>;
}

function migrateLegacyToken(): string | null {
  try {
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (!legacy) return null;
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return legacy;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      isReady: false,
      isAuthenticated: false,

      setAccessToken: (token) => {
        set({
          accessToken: token,
          isAuthenticated: Boolean(token),
        });
      },

      syncAuth: () => {
        set({ isAuthenticated: Boolean(get().accessToken) });
      },

      clearSession: () => {
        set({ accessToken: null, isAuthenticated: false });
      },

      /**
       * Restore session on hard refresh.
       * - Prefer silently rotating via httpOnly refresh cookie.
       * - If refresh fails but an access token still exists, keep the user logged in
       *   (token validity is checked on the next API call).
       */
      bootstrap: async () => {
        // Wait for Zustand persist to rehydrate from localStorage
        if (!useAuthStore.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            const unsub = useAuthStore.persist.onFinishHydration(() => {
              unsub();
              resolve();
            });
          });
        }

        // One-time migration from the old raw localStorage JWT key
        const legacy = migrateLegacyToken();
        if (legacy && !get().accessToken) {
          get().setAccessToken(legacy);
        }

        const existing = get().accessToken;

        try {
          try {
            const response = await authApi.refresh();
            if (response.data?.accessToken) {
              get().setAccessToken(response.data.accessToken);
            }
          } catch {
            if (!existing) {
              get().clearSession();
            }
          }
        } finally {
          set({
            isAuthenticated: Boolean(get().accessToken),
            isReady: true,
          });
        }
      },

      logout: async () => {
        // Clear local auth immediately so in-flight requests don't race /auth/refresh
        get().clearSession();

        try {
          await authApi.logout();
        } catch {
          // Best-effort — missing refresh cookie still counts as logged out locally
        }
      },
    }),
    {
      name: AUTH_PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.isAuthenticated = Boolean(state.accessToken);
      },
    },
  ),
);

/** Non-React accessors for axios / services (use getState — never call hooks outside React). */
export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}

export function saveAccessToken(token: string): void {
  useAuthStore.getState().setAccessToken(token);
}

export function clearAccessToken(): void {
  useAuthStore.getState().clearSession();
}
