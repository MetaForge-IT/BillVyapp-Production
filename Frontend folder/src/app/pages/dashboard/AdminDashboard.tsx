import { AdminFranchisePanel } from "./components/AdminFranchisePanel";
import { CriticalAlerts } from "./components/CriticalAlerts";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardState } from "./components/DashboardState";
import { KpiGrid } from "./components/KpiGrid";
import { RevenueInsights } from "./components/RevenueInsights";
import { TodaySchedule } from "./components/TodaySchedule";

/**
 * Admin dashboard — revenue insights + franchise management (managers & shop addresses).
 * Header stays pinned; body scrolls. Height/padding calibrated via `.dashboard-shell`.
 */
export function AdminDashboard() {
  return (
    <div className="dashboard-shell">
      <div className="shrink-0">
        <DashboardHeader />
      </div>
      <div className="dashboard-shell-body space-y-3 sm:space-y-4">
        <DashboardState>
          <KpiGrid />
          <RevenueInsights />
          <AdminFranchisePanel />
          <div className="grid min-w-0 max-w-full items-stretch gap-3 sm:gap-4 lg:grid-cols-5">
            <div className="flex min-h-0 min-w-0 flex-col lg:col-span-3">
              <TodaySchedule />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col lg:col-span-2">
              <CriticalAlerts />
            </div>
          </div>
        </DashboardState>
      </div>
    </div>
  );
}
