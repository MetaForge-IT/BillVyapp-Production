import { motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Star,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { MetricCard } from "../../../components/shared/MetricCard";
import { dashboardFadeUpStagger } from "../motion";
import { useDashboard } from "../useDashboard";

function pctChange(today: number, yesterday: number): { text: string; positive: boolean } {
  if (yesterday === 0) {
    if (today === 0) return { text: "0%", positive: true };
    return { text: "+100%", positive: true };
  }
  const delta = Math.round(((today - yesterday) / yesterday) * 100);
  return {
    text: `${delta >= 0 ? "+" : ""}${delta}%`,
    positive: delta >= 0,
  };
}

/** Operations KPIs for managers — no revenue metrics. */
export function ManagerKpiGrid() {
  const { data } = useDashboard();
  const k = data?.businessKpis;
  const inv = data?.inventoryAnalytics;

  const todayAppts = k?.todayAppointments ?? 0;
  const yesterdayAppts = k?.yesterdayAppointments ?? 0;
  const apptChange = pctChange(todayAppts, yesterdayAppts);
  const walkIns = k?.walkInCount ?? 0;
  const checkedIn = k?.checkedInToday ?? 0;
  const noShows = k?.noShowsToday ?? 0;
  const pendingCount = k?.pendingPaymentsCount ?? 0;
  const pendingAmount = k?.pendingPaymentsAmount ?? 0;
  const satisfaction = k?.customerSatisfaction ?? 0;
  const reviewCount = k?.satisfactionReviewCount ?? 0;
  const newCustomers = k?.newCustomersToday ?? 0;
  const newMonth = k?.newCustomersMonth ?? 0;
  const lowStock = inv?.lowStock ?? k?.lowStockProductsCount ?? 0;
  const outOfStock = inv?.outOfStock ?? 0;

  const metrics = [
    {
      label: "Today's Appointments",
      value: String(todayAppts),
      change: apptChange.text,
      changePositive: apptChange.positive,
      comparison: `vs ${yesterdayAppts} yesterday`,
      icon: Calendar,
      sparkline: data?.kpiMetrics?.find((m) => m.label === "Today's Walk-ins")?.sparkline ?? [{ v: 0 }],
      href: "/appointments",
      accent: "#D4AF37",
    },
    {
      label: "Walk-ins Today",
      value: String(walkIns),
      change: walkIns > 0 ? `${walkIns} live` : "None yet",
      changePositive: walkIns > 0,
      comparison: `${k?.upcomingAppointmentsCount ?? 0} upcoming in queue`,
      icon: Users,
      sparkline: data?.kpiMetrics?.find((m) => m.label === "Today's Walk-ins")?.sparkline ?? [{ v: 0 }],
      href: "/appointments?type=walk-in",
    },
    {
      label: "On the Floor",
      value: String(checkedIn),
      change: noShows > 0 ? `${noShows} no-show` : "On track",
      changePositive: noShows === 0,
      comparison: `${checkedIn} checked in · ${noShows} no-shows`,
      icon: CheckCircle2,
      sparkline: [{ v: Math.max(0, checkedIn - 1) }, { v: checkedIn }, { v: checkedIn }],
      href: "/appointments",
      accent: "#111118",
    },
    {
      label: "Pending Bills",
      value: String(pendingCount),
      change: pendingCount > 0 ? "Collect due" : "All clear",
      changePositive: pendingCount === 0,
      comparison:
        pendingCount > 0
          ? `₹${pendingAmount.toLocaleString("en-IN")} outstanding`
          : "No open balances",
      icon: Wallet,
      sparkline: data?.kpiMetrics?.find((m) => m.label === "Pending Payments")?.sparkline ?? [{ v: 0 }],
      href: "/appointments",
      accent: "#111118",
    },
    {
      label: "New Customers",
      value: String(newCustomers),
      change: newMonth > 0 ? `${newMonth} this month` : "—",
      changePositive: true,
      comparison: `${newMonth} joined this month`,
      icon: UserPlus,
      sparkline: data?.kpiMetrics?.find((m) => m.label === "New Customers")?.sparkline ?? [{ v: 0 }],
      href: "/customers",
    },
    {
      label: "Satisfaction",
      value: satisfaction > 0 ? satisfaction.toFixed(1) : "—",
      change: reviewCount > 0 ? `${reviewCount} today` : "No reviews",
      changePositive: satisfaction >= 4 || satisfaction === 0,
      comparison:
        reviewCount > 0 ? `Avg from ${reviewCount} review${reviewCount === 1 ? "" : "s"} today` : "Ask for feedback after checkout",
      icon: Star,
      sparkline: data?.kpiMetrics?.find((m) => m.label === "Customer Satisfaction")?.sparkline ?? [{ v: 0 }],
      href: "/feedback",
      accent: "#D4AF37",
    },
    {
      label: "Stock Alerts",
      value: String(lowStock + outOfStock),
      change: outOfStock > 0 ? `${outOfStock} out` : lowStock > 0 ? "Reorder" : "Healthy",
      changePositive: lowStock + outOfStock === 0,
      comparison:
        lowStock + outOfStock > 0
          ? `${lowStock} low · ${outOfStock} out of stock`
          : "Inventory levels OK",
      icon: AlertTriangle,
      sparkline: [{ v: outOfStock }, { v: lowStock }, { v: lowStock + outOfStock }],
      href: "/inventory?tab=stock",
      accent: "#111118",
    },
  ];

  return (
    <section aria-label="Manager operations indicators">
      <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {metrics.map((kpi, i) => (
          <motion.div key={kpi.label} custom={i} variants={dashboardFadeUpStagger} initial="hidden" animate="show" className="h-full min-h-0">
            <MetricCard
              label={kpi.label}
              value={kpi.value}
              change={kpi.change}
              changePositive={kpi.changePositive}
              comparison={kpi.comparison}
              icon={kpi.icon}
              sparkline={kpi.sparkline}
              accent={kpi.accent}
              href={kpi.href}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
