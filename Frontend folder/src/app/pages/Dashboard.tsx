import { AdminDashboard } from "./dashboard/AdminDashboard";
import { ManagerDashboard } from "./dashboard/ManagerDashboard";
import { useRole } from "../context/RoleContext";

/**
 * Role-based dashboard — admins get revenue insights, managers get operations only.
 */
export function Dashboard() {
  const { role } = useRole();
  return role === "admin" ? <AdminDashboard /> : <ManagerDashboard />;
}
