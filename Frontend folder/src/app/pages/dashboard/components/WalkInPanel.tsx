import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { Clock, ArrowUpRight, UserPlus } from "lucide-react";
import { DashboardCard, DashboardCardHeader, SectionLabel } from "./DashboardCard";
import { useDashboard } from "../useDashboard";
import { DASHBOARD_VIEWPORT, dashboardFadeUp } from "../motion";

/** Walk-in summary — right panel below main dashboard KPIs / insights. */
export function WalkInPanel() {
  const navigate = useNavigate();
  const { data, loading } = useDashboard();
  const walkIns = data?.businessKpis?.walkInCount ?? 0;
  const display = loading && !data?.businessKpis ? "…" : String(walkIns);

  return (
    <section aria-label="Walk-in customers" className="flex flex-col">
      <SectionLabel>Walk-ins Today</SectionLabel>
      <motion.div variants={dashboardFadeUp} initial="hidden" whileInView="show" viewport={DASHBOARD_VIEWPORT}>
        <DashboardCard>
          <DashboardCardHeader
            icon={Clock}
            title="Walk-in Customers"
            badge={walkIns > 0 ? `${walkIns} today` : undefined}
            action="View all"
            onAction={() => navigate("/appointments?type=walk-in")}
          />
          <div className="p-4 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#7C6FCD]/10 border border-[#7C6FCD]/25">
              <UserPlus className="h-6 w-6 text-[#7C6FCD]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[28px] font-bold text-[#111118] tabular-nums leading-none tracking-tight">
                {display}
              </p>
              <p className="mt-1.5 text-[12px] text-[#6b6b6b]">
                Walk-in customers checked in today
              </p>
            </div>
            <Link
              to="/walk-in"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-2 text-[11px] font-semibold text-[#111118] hover:bg-[#D4AF37]/18 transition-colors"
            >
              New walk-in
              <ArrowUpRight className="h-3.5 w-3.5 text-[#D4AF37]" />
            </Link>
          </div>
        </DashboardCard>
      </motion.div>
    </section>
  );
}
