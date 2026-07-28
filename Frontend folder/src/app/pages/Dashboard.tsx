import { CriticalAlerts } from "./dashboard/components/CriticalAlerts";
import { DashboardHeader } from "./dashboard/components/DashboardHeader";
import { DashboardState } from "./dashboard/components/DashboardState";
import { KpiGrid } from "./dashboard/components/KpiGrid";
import { RevenueInsights } from "./dashboard/components/RevenueInsights";
import { TodaySchedule } from "./dashboard/components/TodaySchedule";
import { WalkInPanel } from "./dashboard/components/WalkInPanel";

export function Dashboard() {
  return (
    <div className="space-y-4">
      <DashboardHeader />
      <DashboardState>
        <KpiGrid />

        {/* Walk-ins — right panel directly below dashboard KPIs */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="hidden md:block md:col-span-3" aria-hidden />
          <div className="md:col-span-2">
            <WalkInPanel />
          </div>
        </div>

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
