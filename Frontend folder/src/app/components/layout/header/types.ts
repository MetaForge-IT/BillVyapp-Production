import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Package,
  Settings,
  Wallet,
} from "lucide-react";
import type { UserRole } from "../../../context/RoleContext";

export type NotificationCategory =
  | "warning"
  | "success"
  | "payment"
  | "appointment"
  | "inventory"
  | "system";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: NotificationCategory;
  read: boolean;
  href?: string;
  /** Roles that can see this notification. Undefined = visible to all roles. */
  roles?: UserRole[];
}

export const notificationCategoryConfig: Record<
  NotificationCategory,
  { label: string; icon: LucideIcon; accent: string; bg: string; border: string }
> = {
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    accent: "text-[#9a7d20]",
    bg: "bg-[#D4AF37]/10",
    border: "border-[#D4AF37]/22",
  },
  success: {
    label: "Success",
    icon: CheckCircle2,
    accent: "text-[#9a7d20]",
    bg: "bg-[#D4AF37]/12",
    border: "border-[#D4AF37]/25",
  },
  payment: {
    label: "Payment",
    icon: Wallet,
    accent: "text-[#111118]",
    bg: "bg-[#FAF8F2]",
    border: "border-black/[0.08]",
  },
  appointment: {
    label: "Appointment",
    icon: Calendar,
    accent: "text-[#9a7d20]",
    bg: "bg-[#D4AF37]/08",
    border: "border-[#D4AF37]/18",
  },
  inventory: {
    label: "Inventory",
    icon: Package,
    accent: "text-[#3f3f46]",
    bg: "bg-[#FAF8F2]",
    border: "border-black/[0.08]",
  },
  system: {
    label: "System",
    icon: Settings,
    accent: "text-[#111118]",
    bg: "bg-[#121212]/[0.04]",
    border: "border-black/[0.08]",
  },
};

export interface ProfileMenuItem {
  id: string;
  label: string;
  href?: string;
  destructive?: boolean;
}

export const profileMenuItems: ProfileMenuItem[] = [
  { id: "profile", label: "My Profile", href: "/profile" },
  { id: "notifications", label: "Notifications", href: "/notifications" },
  { id: "help", label: "Help & Support", href: "/help" },
  { id: "signout", label: "Sign Out", href: "/", destructive: true },
];
