import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authService } from "../../services/authService";
import { getAccessToken, useAuthStore } from "../../stores/authStore";
import {
  cacheAuthUser,
  clearCachedAuthUser,
  readCachedAuthUser,
} from "../../lib/authUserCache";

export type UserRole =
  | "super_admin"
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
  super_admin: { label: "Super Admin", description: "Platform · all franchises", emoji: "🛡️" },
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

/** Roles that can create vendor bills, POs, and other inventory write actions. */
export const INVENTORY_OPS_ROLES: ReadonlyArray<UserRole> = [
  "manager",
  "inventory",
  "receptionist",
  "stylist",
  "accountant",
];

export function canManageInventoryOps(role: UserRole): boolean {
  return INVENTORY_OPS_ROLES.includes(role);
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === "super_admin";
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Read role from the access JWT immediately (no network). */
function roleFromAccessToken(): UserRole | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const role = typeof payload?.role === "string" ? payload.role : null;
  return role && isUserRole(role) ? role : null;
}

function firstNameFrom(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  /** True once role is known from JWT or /me (avoids defaulting to manager). */
  isReady: boolean;
  fullName: string;
  firstName: string;
  shopName: string;
  shopBranchLabel: string;
  shopAddress: string;
  franchiseName: string;
}

const RoleContext = createContext<RoleContextType | null>(null);

function initialRole(): UserRole {
  return roleFromAccessToken() ?? "manager";
}

function initialFullName(): string {
  const cached = readCachedAuthUser();
  const tokenRole = roleFromAccessToken();
  // Only trust cache if it matches the current token role (avoids stale name after account switch)
  if (cached && tokenRole && isUserRole(cached.role) && cached.role === tokenRole) {
    return cached.fullName;
  }
  if (cached && !tokenRole) return cached.fullName;
  return "";
}

function shopFieldsFromUser(user: {
  shop?: {
    name: string;
    displayName: string | null;
    city: string | null;
    address?: string | null;
    state?: string | null;
    pincode?: string | null;
    franchiseName: string | null;
  } | null;
} | null) {
  const shop = user?.shop;
  const franchiseName = shop?.franchiseName ?? "";
  // Brand / salon name on the first line of the sidebar strip
  const shopName = franchiseName || shop?.name || "";
  const branch = shop?.displayName || shop?.name || "Shop";
  const city = shop?.city?.trim() || "";
  // e.g. "Main Branch · Hyderabad" so managers see their own shop clearly
  const shopBranchLabel = city ? `${branch} · ${city}` : branch;
  const addressParts = [
    shop?.address?.trim(),
    city && !shop?.address?.includes(city) ? city : null,
    shop?.state?.trim(),
    shop?.pincode?.trim(),
  ].filter(Boolean);
  const shopAddress = addressParts.join(", ");
  return { shopName, shopBranchLabel, franchiseName, shopAddress };
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState(initialFullName);
  const [shopName, setShopName] = useState("");
  const [shopBranchLabel, setShopBranchLabel] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [franchiseName, setFranchiseName] = useState("");
  const [isReady, setIsReady] = useState(() => Boolean(roleFromAccessToken() || readCachedAuthUser()));

  useEffect(() => {
    const tokenRole = roleFromAccessToken();
    if (tokenRole) {
      setRole(tokenRole);
      setIsReady(true);
    }

    if (!accessToken || !authService.isAuthenticated()) {
      if (!accessToken) {
        clearCachedAuthUser();
        setFullName("");
        setShopName("");
        setShopBranchLabel("");
        setShopAddress("");
        setFranchiseName("");
      }
      setIsReady(Boolean(tokenRole));
      return;
    }

    // Prefer cached name immediately while /me refreshes
    const cached = readCachedAuthUser();
    if (cached?.fullName && (!tokenRole || cached.role === tokenRole)) {
      setFullName(cached.fullName);
      const fields = shopFieldsFromUser(cached);
      setShopName(fields.shopName);
      setShopBranchLabel(fields.shopBranchLabel);
      setShopAddress(fields.shopAddress);
      setFranchiseName(fields.franchiseName);
    }

    let cancelled = false;
    void authService.getCurrentUser().then((user) => {
      if (cancelled || !user) return;
      cacheAuthUser(user);
      if (user.role && isUserRole(user.role)) {
        setRole(user.role);
      }
      if (user.fullName?.trim()) {
        setFullName(user.fullName.trim());
      }
      const fields = shopFieldsFromUser(user);
      setShopName(fields.shopName);
      setShopBranchLabel(fields.shopBranchLabel);
      setShopAddress(fields.shopAddress);
      setFranchiseName(fields.franchiseName);
      setIsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const firstName = firstNameFrom(fullName);

  const value = useMemo(
    () => ({
      role,
      setRole,
      isReady,
      fullName,
      firstName,
      shopName,
      shopBranchLabel,
      shopAddress,
      franchiseName,
    }),
    [role, isReady, fullName, firstName, shopName, shopBranchLabel, shopAddress, franchiseName],
  );

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
