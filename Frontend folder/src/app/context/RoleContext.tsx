import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "../../services/authService";

export type UserRole =
  | "admin"
  | "manager"
  | "receptionist"
  | "stylist"
  | "accountant"
  | "inventory";

export const roleConfig: Record<
  UserRole,
  { label: string; description: string; emoji: string }
> = {
  admin: { label: "Admin", description: "Full access · revenue & reports", emoji: "👑" },
  manager: { label: "Manager", description: "Manage salon operations", emoji: "🏢" },
  receptionist: { label: "Receptionist", description: "Front desk & bookings", emoji: "💁" },
  stylist: { label: "Stylist / Employee", description: "Your daily schedule", emoji: "💇" },
  accountant: { label: "Accountant", description: "Finance & billing", emoji: "📊" },
  inventory: { label: "Inventory Manager", description: "Stock & supplies", emoji: "📦" },
};

/** Roles allowed to view revenue / revenue reports. */
export const REVENUE_ROLES: ReadonlyArray<UserRole> = ["admin"];

function isUserRole(value: string): value is UserRole {
  return value in roleConfig;
}

export function canViewRevenue(role: UserRole): boolean {
  return REVENUE_ROLES.includes(role);
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("manager");

  useEffect(() => {
    if (!authService.isAuthenticated()) return;

    void authService.getCurrentUser().then((user) => {
      if (user?.role && isUserRole(user.role)) {
        setRole(user.role);
      }
    });
  }, []);

  return (
    <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
