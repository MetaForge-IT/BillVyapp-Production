import { CriticalAlerts } from "./dashboard/components/CriticalAlerts";
import { DashboardHeader } from "./dashboard/components/DashboardHeader";
import { DashboardState } from "./dashboard/components/DashboardState";
import { KpiGrid } from "./dashboard/components/KpiGrid";
import { RevenueInsights } from "./dashboard/components/RevenueInsights";
import { TodaySchedule } from "./dashboard/components/TodaySchedule";

export function Dashboard() {
  return (
    <div className="space-y-4">
      <DashboardHeader />
      <DashboardState>
        <KpiGrid />
        <RevenueInsights />

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
