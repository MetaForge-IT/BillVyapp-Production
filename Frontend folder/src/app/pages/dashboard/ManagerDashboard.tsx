import { CriticalAlerts } from "./components/CriticalAlerts";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardState } from "./components/DashboardState";
import { KpiGrid } from "./components/KpiGrid";
import { PanelBadge } from "./components/PanelBadge";
import { TodaySchedule } from "./components/TodaySchedule";

/**
 * Manager dashboard — operations only, NO revenue / revenue reports.
 */
export function ManagerDashboard() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <PanelBadge />
      </div>
      <DashboardHeader />
      <DashboardState>
        <KpiGrid />
        <div className="grid gap-4 md:grid-cols-5 items-stretch">
          <div className="md:col-span-3 flex flex-col min-h-0">
            <TodaySchedule />
          </div>
          <div className="md:col-span-2 flex flex-col min-h-0">
            <CriticalAlerts />
          </div>
        </div>
      </DashboardState>
    </div>
  );
}
