import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "../../stores/authStore";

/** @deprecated Use `useAuthStore` directly. Kept for gradual migration. */
export function useAuth() {
  const isReady = useAuthStore((state) => state.isReady);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const syncAuth = useAuthStore((state) => state.syncAuth);

  return { isReady, isAuthenticated, bootstrap, syncAuth };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return children;
}
