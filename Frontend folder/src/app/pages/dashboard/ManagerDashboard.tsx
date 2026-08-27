import { CriticalAlerts } from "./components/CriticalAlerts";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardState } from "./components/DashboardState";
import { FloorStatusPanel } from "./components/FloorStatusPanel";
import { LowStockPanel } from "./components/LowStockPanel";
import { ManagerKpiGrid } from "./components/ManagerKpiGrid";
import { QuickActionsGrid } from "./components/QuickActionsGrid";
import { RecentFeedbackPanel } from "./components/RecentFeedbackPanel";
import { TodaySchedule } from "./components/TodaySchedule";

/**
 * Manager dashboard — floor operations, queue, stock & feedback.
 * No revenue charts (admin-only). Header stays pinned; body scrolls.
 * Height/padding calibrated via `.dashboard-shell`.
 */
export function ManagerDashboard() {
  return (
    <div className="dashboard-shell">
      <div className="shrink-0">
        <DashboardHeader />
      </div>
      <div className="dashboard-shell-body space-y-3 sm:space-y-4">
        <DashboardState>
          <QuickActionsGrid />
          <ManagerKpiGrid />

          <div className="grid min-w-0 max-w-full items-stretch gap-3 sm:gap-4 lg:grid-cols-5">
            <div className="flex min-h-0 min-w-0 flex-col lg:col-span-3">
              <TodaySchedule />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col lg:col-span-2">
              <FloorStatusPanel />
            </div>
          </div>

          <div className="grid min-w-0 max-w-full items-stretch gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
            <LowStockPanel />
            <RecentFeedbackPanel />
            <div className="min-w-0 md:col-span-2 xl:col-span-1">
              <CriticalAlerts />
            </div>
          </div>
        </DashboardState>
      </div>
    </div>
  );
}
