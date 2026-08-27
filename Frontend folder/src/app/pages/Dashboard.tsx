import { Navigate } from "react-router";
import { AdminDashboard } from "./dashboard/AdminDashboard";
import { ManagerDashboard } from "./dashboard/ManagerDashboard";
import { useRole } from "../context/RoleContext";

/**
 * Role-based dashboard — admins get revenue insights, managers get operations only.
 * Super admins are sent to the platform console.
 */
export function Dashboard() {
  const { role, isReady } = useRole();

  if (!isReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-[#52525b]">
        Loading dashboard…
      </div>
    );
  }

  if (role === "super_admin") {
    return <Navigate to="/super-admin" replace />;
  }

  return role === "admin" ? <AdminDashboard /> : <ManagerDashboard />;
}
