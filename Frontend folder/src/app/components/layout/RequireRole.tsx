import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useRole, type UserRole } from "../../context/RoleContext";

/**
 * Guards children by role. Non-matching users are sent back to /dashboard.
 * Waits until role is known from JWT so we never bounce an admin incorrectly.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: ReactNode;
}) {
  const { role, isReady } = useRole();

  if (!isReady) return null;

  if (!roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
