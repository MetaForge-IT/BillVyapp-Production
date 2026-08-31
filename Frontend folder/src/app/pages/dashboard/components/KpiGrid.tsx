import { motion } from "framer-motion";
import { MetricCard } from "../../../components/shared/MetricCard";
import { KPI_DRILL_ROUTES } from "../../../components/shared/PageStatCard";
import { useMinWidth } from "../../../hooks/useMinWidth";
import { mapKpiMetrics } from "../data";
import { dashboardFadeUpStagger } from "../motion";
import { useDashboard } from "../useDashboard";

export function KpiGrid() {
  const { data } = useDashboard();
  const kpiMetrics = mapKpiMetrics(data?.kpiMetrics ?? []);
  const showKpi = useMinWidth(768);

  if (!showKpi) return null;

  return (
    <section
      aria-label="Key performance indicators"
      className="dashboard-kpi-mobile-hide"
    >
      <div className="dashboard-kpi-grid dashboard-kpi-grid--admin">
        {kpiMetrics.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            custom={i}
            variants={dashboardFadeUpStagger}
            initial="hidden"
            animate="show"
            className="h-full min-h-0 min-w-0"
          >
            <MetricCard
              label={kpi.label}
              value={kpi.value}
              change={kpi.change}
              changePositive={kpi.changePositive}
              comparison={kpi.comparison}
              icon={kpi.icon}
              sparkline={kpi.sparkline}
              accent={kpi.accent}
              revenue={kpi.label === "Today's Revenue"}
              href={KPI_DRILL_ROUTES[kpi.label]}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
