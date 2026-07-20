import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "../../api/auth";
import { clearAccessToken, getAccessToken, saveAccessToken } from "../../lib/tokenStorage";

interface AuthContextValue {
  isReady: boolean;
  isAuthenticated: boolean;
  bootstrap: () => Promise<void>;
  syncAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const syncAuth = useCallback(() => {
    setIsAuthenticated(Boolean(getAccessToken()));
  }, []);

  const bootstrap = useCallback(async () => {
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
      setIsAuthenticated(Boolean(getAccessToken()));
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const value = useMemo(
    () => ({ isReady, isAuthenticated, bootstrap, syncAuth }),
    [isReady, isAuthenticated, bootstrap, syncAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
