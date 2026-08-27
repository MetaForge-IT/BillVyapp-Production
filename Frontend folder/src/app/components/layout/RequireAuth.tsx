import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";

function buildLoginRedirect(pathname: string, search: string): string {
  const returnTo = `${pathname}${search}`;
  if (
    !returnTo ||
    returnTo === "/" ||
    returnTo === "/landing" ||
    returnTo.startsWith("/login")
  ) {
    return "/login";
  }
  return `/login?redirect=${encodeURIComponent(returnTo)}`;
}

export function RequireAuth() {
  const { isReady, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f2ed] text-sm text-[#3f3f46]">
        Restoring your session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={buildLoginRedirect(location.pathname, location.search)} replace />;
  }

  return <Outlet />;
}
