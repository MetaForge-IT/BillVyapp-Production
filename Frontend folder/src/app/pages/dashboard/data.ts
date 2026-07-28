import type { LucideIcon } from "lucide-react";
import {
  IndianRupee,
  Calendar,
  Users,
  Wallet,
  Star,
  AlertTriangle,
  CalendarClock,
  Package,
  UserPlus,
  CalendarPlus,
} from "lucide-react";
import type {
  DashboardAlert,
  DashboardKpiMetric,
  DashboardServicePerformance,
  DashboardTrendPoint,
  DashboardUpcomingAppointment,
} from "../../../api/dashboard";

export interface KpiItem extends DashboardKpiMetric {
  icon: LucideIcon;
}

export type TrendPoint = DashboardTrendPoint;
export type ServicePerformance = DashboardServicePerformance;
export type UpcomingAppointment = DashboardUpcomingAppointment;

export interface QuickAction {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  primary?: boolean;
}

export interface CriticalAlert {
  id: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  urgent: boolean;
  href: string;
}

const KPI_ICONS: Record<string, LucideIcon> = {
  "Today's Revenue": IndianRupee,
  "Appointments Today": Calendar,
  "New Customers": Users,
  "Pending Payments": Wallet,
  "Customer Satisfaction": Star,
};

const ALERT_ICONS: Record<string, LucideIcon> = {
  inventory: Package,
  payment: Wallet,
  appointment: CalendarClock,
  warning: AlertTriangle,
};

export function mapKpiMetrics(metrics: DashboardKpiMetric[]): KpiItem[] {
  return metrics.map((metric) => ({
    ...metric,
    icon: KPI_ICONS[metric.label] ?? IndianRupee,
  }));
}

export function mapAlerts(alerts: DashboardAlert[]): CriticalAlert[] {
  return alerts.map((alert) => ({
    id: alert.id,
    title: alert.title,
    detail: alert.detail,
    urgent: alert.urgent,
    href: alert.href,
    icon: ALERT_ICONS[alert.type] ?? AlertTriangle,
  }));
}

export const quickActions: QuickAction[] = [
  { label: "Add New Customer", description: "Register a new client", icon: UserPlus, href: "/customers/new" },
  { label: "New Appointment", description: "Book an appointment", icon: CalendarPlus, href: "/appointments/new" },
  { label: "New Walk-in", description: "Add a walk-in customer", icon: Users, href: "/walk-in" },
];
