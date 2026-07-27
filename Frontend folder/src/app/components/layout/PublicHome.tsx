import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { LandingPage } from "../../pages/auth/LandingPage";

/**
 * Public entry at `/`: landing for guests; authenticated users go to the app dashboard.
 */
export function PublicHome() {
  const { isReady, isAuthenticated } = useAuth();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F] text-sm text-white/60">
        Loading…
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}
