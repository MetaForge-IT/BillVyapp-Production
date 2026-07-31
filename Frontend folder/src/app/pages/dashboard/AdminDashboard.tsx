import { AdminFranchisePanel } from "./components/AdminFranchisePanel";
import { CriticalAlerts } from "./components/CriticalAlerts";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardState } from "./components/DashboardState";
import { KpiGrid } from "./components/KpiGrid";
import { RevenueInsights } from "./components/RevenueInsights";
import { TodaySchedule } from "./components/TodaySchedule";

/**
 * Admin dashboard — revenue insights + franchise management (managers & shop addresses).
 * Header stays pinned; body scrolls.
 */
export function AdminDashboard() {
  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-0 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <DashboardHeader />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-none pb-2">
        <DashboardState>
          <KpiGrid />
          <RevenueInsights />
          <AdminFranchisePanel />
          <div className="grid items-stretch gap-4 md:grid-cols-5">
            <div className="flex min-h-0 flex-col md:col-span-3">
              <TodaySchedule />
            </div>
            <div className="flex min-h-0 flex-col md:col-span-2">
              <CriticalAlerts />
            </div>
          </div>
        </DashboardState>
      </div>
    </div>
  );
}
