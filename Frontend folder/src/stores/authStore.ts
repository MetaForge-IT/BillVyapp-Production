import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as authApi from "../api/auth";
import { clearCachedAuthUser } from "../lib/authUserCache";

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
  /** Rotate access token when missing/expired/near expiry. Returns false when logged out. */
  ensureFreshAccessToken: () => Promise<boolean>;
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

/** True when JWT is missing, malformed, or past exp (with small clock skew). */
function isAccessTokenUnusable(token: string | null, skewSeconds = 30): boolean {
  if (!token) return true;
  try {
    const part = token.split(".")[1];
    if (!part) return true;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: unknown };
    if (typeof payload.exp !== "number") return true;
    return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
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
        clearCachedAuthUser();
        set({ accessToken: null, isAuthenticated: false });
      },

      /**
       * Restore session on hard refresh.
       * - Prefer silently rotating via httpOnly refresh cookie.
       * - If refresh fails, keep the access token only when it is still unexpired;
       *   otherwise clear so protected pages never fire APIs with a dead JWT.
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

        try {
          try {
            const response = await authApi.refresh();
            if (response.data?.accessToken) {
              get().setAccessToken(response.data.accessToken);
            } else if (isAccessTokenUnusable(get().accessToken)) {
              get().clearSession();
            }
          } catch {
            if (isAccessTokenUnusable(get().accessToken)) {
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

      ensureFreshAccessToken: async () => {
        const current = get().accessToken;
        // Refresh proactively when expired or within 2 minutes of expiry (access JWT is 15m).
        const needsRefresh = !current || isAccessTokenUnusable(current, 120);

        if (!needsRefresh) {
          return true;
        }

        try {
          const response = await authApi.refresh();
          if (response.data?.accessToken) {
            get().setAccessToken(response.data.accessToken);
            return true;
          }
        } catch {
          // fall through
        }

        if (isAccessTokenUnusable(get().accessToken)) {
          get().clearSession();
          return false;
        }

        return Boolean(get().accessToken);
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
