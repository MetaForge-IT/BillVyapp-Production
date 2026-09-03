import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  CreditCard,
  UserCircle,
  Package,
  BarChart3,
  Sparkles,
  TrendingUp,
  Brain,
  CalendarDays,
  UserPlus,
  ListOrdered,
  Crown,
  MessageSquare,
  Layers,
  Tag,
  Receipt,
  Wallet,
  ClipboardList,
  Award,
  Truck,
  ShoppingCart,
  FileText,
  Plug,
  Megaphone,
} from "lucide-react";

export interface NavChildItem {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavChildItem[];
  /** Roles that can see this nav item. Undefined = visible to all. */
  roles?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Employees and Reports/Analytics pages were permanently deleted from this
// project — there is no nav entry for them and none to restore.
export const enterpriseNavigation: NavSection[] = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Billing", href: "/walk-in", icon: UserPlus, roles: ["manager"] },
      { label: "Appointments", href: "/appointments", icon: CalendarDays, roles: ["manager"] },
    ],
  },
  {
    title: "Customers",
    items: [
      { label: "Customers", href: "/customers", icon: Users },
    ],
  },
  {
    title: "Services",
    items: [
      { label: "Services", href: "/services", icon: Layers },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Revenue Report", href: "/finance?tab=receipts", icon: Wallet, roles: ["admin"] },
      {
        label: "Pending Payments",
        href: "/finance?tab=receipts&section=pending",
        icon: ClipboardList,
        roles: ["manager"],
      },
      { label: "Expenses", href: "/expenses", icon: Receipt, roles: ["admin", "manager"] },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone, roles: ["admin"] },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Inventory", href: "/inventory", icon: Package },
    ],
  },
];

export const quickSearchItems: Array<{
  type: string;
  label: string;
  href: string;
  meta: string;
}> = [];

/** Match a nav href (path + optional query) against current location. */
export function isNavHrefActive(pathname: string, search: string, href: string): boolean {
  const qIdx = href.indexOf("?");
  const path = (qIdx >= 0 ? href.slice(0, qIdx) : href).split("#")[0];
  const base = path === "/" ? "/" : path.replace(/\/$/, "") || "/";

  if (base === "/") {
    if (pathname !== "/") return false;
    if (qIdx < 0) return !search || search === "?";
    const expected = new URLSearchParams(href.slice(qIdx + 1));
    const current = new URLSearchParams(search.replace(/^\?/, ""));
    for (const [k, v] of expected.entries()) {
      if (current.get(k) !== v) return false;
    }
    return true;
  }

  // Flat sidebar items: exact path only when href has no query (so /appointments
  // does not stay active on /appointments/new?type=walk-in).
  if (qIdx < 0) return pathname === base;

  if (pathname !== base) return false;

  const expected = new URLSearchParams(href.slice(qIdx + 1));
  const current = new URLSearchParams(search.replace(/^\?/, ""));
  for (const [k, v] of expected.entries()) {
    if (current.get(k) !== v) return false;
  }
  return true;
}

/** Parent nav item active when current route is under its base path. */
export function isNavParentActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0].split("#")[0];
  if (base === "/" || base === "/dashboard") return pathname === base;
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Normalize route path for comparison (no query/hash, no trailing slash). */
export function normalizePathname(pathname: string): string {
  const base = pathname.split("?")[0].split("#")[0];
  if (base === "/") return "/";
  return base.replace(/\/$/, "") || "/";
}

/** Top-level routes linked directly from the sidebar — no back button on these. */
export const SIDEBAR_DIRECT_PATHS: ReadonlySet<string> = new Set([
  ...enterpriseNavigation.flatMap(section =>
    section.items.map(item => normalizePathname(item.href)),
  ),
  "/notifications",
]);

export function isSidebarDirectPage(pathname: string): boolean {
  return SIDEBAR_DIRECT_PATHS.has(normalizePathname(pathname));
}

export function shouldShowPageBack(pathname: string): boolean {
  return !isSidebarDirectPage(pathname);
}

export function getBackFallbackPath(pathname: string): string {
  const path = normalizePathname(pathname);
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) return "/dashboard";
  return `/${segments.slice(0, -1).join("/")}`;
}
