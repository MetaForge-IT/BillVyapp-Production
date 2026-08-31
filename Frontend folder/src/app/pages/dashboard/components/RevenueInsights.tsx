import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Scissors, TrendingUp } from "lucide-react";
import { SafeChartContainer } from "../../../components/shared/SafeChartContainer";
import type { DashboardTrendPoint } from "../../../api/dashboard";
import { DashboardCard, DashboardCardHeader, SectionLabel } from "./DashboardCard";
import {
  DASHBOARD_DURATION,
  DASHBOARD_STAGGER,
  DASHBOARD_STAGGER_BASE,
  DASHBOARD_VIEWPORT,
  dashboardFadeUpStagger,
} from "../motion";
import { useDashboard } from "../useDashboard";

type ChartClickState = {
  activePayload?: Array<{ payload: DashboardTrendPoint }>;
};

function getTrendPoint(state: ChartClickState | null | undefined): DashboardTrendPoint | null {
  const point = state?.activePayload?.[0]?.payload;
  return point?.date ? point : null;
}

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white px-3 py-2 shadow-xl">
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#52525b]">{label}</p>
      <p className="text-[13px] font-bold text-[#111118]">₹{(payload[0].value / 1000).toFixed(1)}K</p>
      <p className="mt-1 text-[10px] text-[#52525b]">Click to view receipts</p>
    </div>
  );
}

function AppointmentTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white px-3 py-2 shadow-xl">
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#52525b]">{label}</p>
      <p className="text-[13px] font-bold text-[#111118]">{payload[0].value} appointments</p>
      <p className="mt-1 text-[10px] text-[#52525b]">Click to view schedule</p>
    </div>
  );
}

export function RevenueInsights() {
  const navigate = useNavigate();
  const { data } = useDashboard();
  const weeklyTrend = data?.weeklyTrend ?? [];
  const trendWithDates = useMemo(() => {
    if (weeklyTrend.length === 0) return weeklyTrend;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return weeklyTrend.map((point, index) => {
      if (point.date) return point;
      const date = new Date(today);
      date.setDate(date.getDate() - (weeklyTrend.length - 1 - index));
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return { ...point, date: `${y}-${m}-${d}` };
    });
  }, [weeklyTrend]);
  const topServices = data?.topServices ?? [];
  const weekTotal = trendWithDates.reduce((sum, d) => sum + d.revenue, 0);
  const hasRevenueTrend = trendWithDates.some((d) => d.revenue > 0);
  const hasAppointmentTrend = trendWithDates.some((d) => d.appointments > 0);

  const openRevenueForDay = (point: DashboardTrendPoint) => {
    navigate(`/finance?tab=receipts&date=${point.date}`);
  };

  const openAppointmentsForDay = (point: DashboardTrendPoint) => {
    navigate(`/appointments?date=${point.date}`);
  };

  const handleRevenueChartClick = (state: ChartClickState) => {
    const point = getTrendPoint(state);
    if (point) openRevenueForDay(point);
  };

  const handleAppointmentChartClick = (state: ChartClickState) => {
    const point = getTrendPoint(state);
    if (point) openAppointmentsForDay(point);
  };

  return (
    <section aria-label="Revenue and business insights" className="min-w-0 max-w-full">
      <SectionLabel>Revenue &amp; Business Insights</SectionLabel>
      <div className="grid min-w-0 max-w-full items-stretch gap-3 sm:gap-4 xl:grid-cols-12">
        <motion.div
          custom={0}
          variants={dashboardFadeUpStagger}
          initial="hidden"
          whileInView="show"
          viewport={DASHBOARD_VIEWPORT}
          className="flex h-full min-w-0 max-w-full flex-col xl:col-span-5"
        >
          <DashboardCard className="h-full min-w-0">
            <DashboardCardHeader
              icon={TrendingUp}
              title="Revenue Trend"
              badge={`₹${(weekTotal / 1000).toFixed(0)}K wk`}
              action="Report"
              onAction={() => navigate("/finance")}
            />
            <div className="min-w-0 max-w-full overflow-hidden p-2.5 sm:p-4">
              {trendWithDates.length === 0 || !hasRevenueTrend ? (
                <p className="py-16 text-center text-[12px] text-[#52525b]">No revenue data in the last 7 days</p>
              ) : (
                <SafeChartContainer className="dashboard-chart-h" height={160} minHeight={160}>
                    <AreaChart
                      data={trendWithDates}
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                      onClick={handleRevenueChartClick}
                      style={{ cursor: "pointer" }}
                    >
                      <defs>
                        <linearGradient id="execRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,24,0.05)" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10, fill: "#52525b", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        padding={{ left: 4, right: 4 }}
                      />
                      <YAxis hide />
                      <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "rgba(0,200,150,0.15)", strokeWidth: 2 }} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#D4AF37"
                        strokeWidth={2.5}
                        fill="url(#execRevGrad)"
                        dot={{ r: 3, fill: "#D4AF37", strokeWidth: 0, cursor: "pointer" }}
                        activeDot={{ r: 5, fill: "#D4AF37", strokeWidth: 0, cursor: "pointer" }}
                      />
                    </AreaChart>
                </SafeChartContainer>
              )}
            </div>
          </DashboardCard>
        </motion.div>

        <motion.div
          custom={1}
          variants={dashboardFadeUpStagger}
          initial="hidden"
          whileInView="show"
          viewport={DASHBOARD_VIEWPORT}
          className="flex h-full min-w-0 max-w-full flex-col xl:col-span-4"
        >
          <DashboardCard className="h-full min-w-0">
            <DashboardCardHeader icon={BarChart3} title="Appointment Trend" badge="7-day" />
            <div className="min-w-0 max-w-full overflow-hidden p-2.5 sm:p-4">
              {trendWithDates.length === 0 || !hasAppointmentTrend ? (
                <p className="py-16 text-center text-[12px] text-[#52525b]">No appointments in the last 7 days</p>
              ) : (
                <SafeChartContainer className="dashboard-chart-h" height={160} minHeight={160}>
                    <BarChart
                      data={trendWithDates}
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                      onClick={handleAppointmentChartClick}
                      style={{ cursor: "pointer" }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,24,0.05)" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10, fill: "#52525b", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        padding={{ left: 4, right: 4 }}
                      />
                      <YAxis allowDecimals={false} hide />
                      <Tooltip content={<AppointmentTooltip />} cursor={{ fill: "rgba(212,175,55,0.08)" }} />
                      <Bar dataKey="appointments" radius={[6, 6, 0, 0]} minPointSize={4} cursor="pointer">
                        {trendWithDates.map((_, i) => (
                          <Cell
                            key={i}
                            fill={i === trendWithDates.length - 1 ? "#D4AF37" : "rgba(17,17,24,0.08)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                </SafeChartContainer>
              )}
            </div>
          </DashboardCard>
        </motion.div>

        <motion.div
          custom={2}
          variants={dashboardFadeUpStagger}
          initial="hidden"
          whileInView="show"
          viewport={DASHBOARD_VIEWPORT}
          className="flex h-full min-w-0 max-w-full flex-col xl:col-span-3"
        >
          <DashboardCard className="h-full min-w-0">
            <DashboardCardHeader
              icon={Scissors}
              title="Service Performance"
              action="All Services"
              onAction={() => navigate("/services")}
            />
            <div className="min-w-0 max-w-full space-y-3.5 overflow-hidden p-2.5 sm:p-4">
              {topServices.length === 0 ? (
                <p className="py-10 text-center text-[12px] text-[#52525b]">No service sales yet</p>
              ) : (
                topServices.map((service, i) => (
                  <div key={service.name} className="min-w-0 max-w-full">
                    <div className="mb-1 flex min-w-0 max-w-full items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                        <span className="w-4 shrink-0 text-[10px] font-bold text-[#D4AF37]">#{i + 1}</span>
                        <p className="truncate text-[12px] font-semibold text-[#111118]">{service.name}</p>
                      </div>
                      <span className="max-w-[40%] shrink-0 truncate text-right text-[11px] font-bold tabular-nums text-[#111118]">
                        ₹{service.revenue.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex min-w-0 max-w-full items-center gap-2">
                      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/[0.05]">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${service.pct}%` }}
                          viewport={DASHBOARD_VIEWPORT}
                          transition={{
                            duration: DASHBOARD_DURATION,
                            delay: DASHBOARD_STAGGER_BASE + i * DASHBOARD_STAGGER,
                          }}
                          className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C9A227]"
                        />
                      </div>
                      <span className="w-10 shrink-0 truncate text-right text-[10px] text-[#52525b] sm:w-14">
                        {service.bookings} bkgs
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DashboardCard>
        </motion.div>
      </div>
    </section>
  );
}
