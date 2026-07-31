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
 */
export function ManagerDashboard() {
  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-0 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <DashboardHeader />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-none pb-2">
        <DashboardState>
          <QuickActionsGrid />
          <ManagerKpiGrid />

          <div className="grid items-stretch gap-4 lg:grid-cols-5">
            <div className="flex min-h-0 flex-col lg:col-span-3">
              <TodaySchedule />
            </div>
            <div className="flex min-h-0 flex-col lg:col-span-2">
              <FloorStatusPanel />
            </div>
          </div>

          <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            <LowStockPanel />
            <RecentFeedbackPanel />
            <div className="md:col-span-2 xl:col-span-1">
              <CriticalAlerts />
            </div>
          </div>
        </DashboardState>
      </div>
    </div>
  );
}
