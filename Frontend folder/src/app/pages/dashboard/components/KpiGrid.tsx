import { motion } from "framer-motion";
import { MetricCard } from "../../../components/shared/MetricCard";
import { KPI_DRILL_ROUTES } from "../../../components/shared/PageStatCard";
import { mapKpiMetrics } from "../data";
import { useDashboard } from "../useDashboard";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function KpiGrid() {
  const { data } = useDashboard();
  const kpiMetrics = mapKpiMetrics(data?.kpiMetrics ?? []);

  return (
    <section aria-label="Key performance indicators">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 items-stretch">
        {kpiMetrics.map((kpi, i) => (
          <motion.div key={kpi.label} custom={i} variants={fadeUp} initial="hidden" animate="show" className="h-full min-h-0">
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
