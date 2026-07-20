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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Scissors, TrendingUp } from "lucide-react";
import type { DashboardTrendPoint } from "../../../api/dashboard";
import { DashboardCard, DashboardCardHeader, SectionLabel } from "./DashboardCard";
import { useDashboard } from "../useDashboard";

type ChartClickState = {
  activePayload?: Array<{ payload: DashboardTrendPoint }>;
};

function getTrendPoint(state: ChartClickState | null | undefined): DashboardTrendPoint | null {
  const point = state?.activePayload?.[0]?.payload;
  return point?.date ? point : null;
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-black/[0.08] shadow-xl px-3 py-2">
      <p className="text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[13px] font-bold text-[#111118]">₹{(payload[0].value / 1000).toFixed(1)}K</p>
      <p className="text-[10px] text-[#9a9a9a] mt-1">Click to view receipts</p>
    </div>
  );
}

function AppointmentTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-black/[0.08] shadow-xl px-3 py-2">
      <p className="text-[11px] font-semibold text-[#9a9a9a] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[13px] font-bold text-[#111118]">{payload[0].value} appointments</p>
      <p className="text-[10px] text-[#9a9a9a] mt-1">Click to view schedule</p>
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
    <section aria-label="Revenue and business insights">
      <SectionLabel>Revenue &amp; Business Insights</SectionLabel>
      <div className="grid gap-4 xl:grid-cols-12 items-stretch">
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="xl:col-span-5 h-full flex flex-col"
        >
          <DashboardCard className="h-full">
            <DashboardCardHeader
              icon={TrendingUp}
              title="Revenue Trend"
              badge={`₹${(weekTotal / 1000).toFixed(0)}K this week`}
              action="Full Report"
              onAction={() => navigate("/finance")}
            />
            <div className="p-4">
              {trendWithDates.length === 0 || !hasRevenueTrend ? (
                <p className="text-[12px] text-[#9a9a9a] text-center py-16">No revenue data in the last 7 days</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
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
                      tick={{ fontSize: 11, fill: "#9a9a9a", fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
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
                </ResponsiveContainer>
              )}
            </div>
          </DashboardCard>
        </motion.div>

        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="xl:col-span-4 h-full flex flex-col"
        >
          <DashboardCard className="h-full">
            <DashboardCardHeader icon={BarChart3} title="Appointment Trend" badge="7-day view" />
            <div className="p-4">
              {trendWithDates.length === 0 || !hasAppointmentTrend ? (
                <p className="text-[12px] text-[#9a9a9a] text-center py-16">No appointments in the last 7 days</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={trendWithDates}
                    margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                    onClick={handleAppointmentChartClick}
                    style={{ cursor: "pointer" }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,24,0.05)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "#9a9a9a", fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
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
                </ResponsiveContainer>
              )}
            </div>
          </DashboardCard>
        </motion.div>

        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="xl:col-span-3 h-full flex flex-col"
        >
          <DashboardCard className="h-full">
            <DashboardCardHeader
              icon={Scissors}
              title="Service Performance"
              action="All Services"
              onAction={() => navigate("/services")}
            />
            <div className="p-4 space-y-3.5">
              {topServices.length === 0 ? (
                <p className="text-[12px] text-[#9a9a9a] text-center py-10">No service sales yet</p>
              ) : topServices.map((service, i) => (
                <div key={service.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-[#D4AF37] w-4 shrink-0">#{i + 1}</span>
                      <p className="text-[12px] font-semibold text-[#111118] truncate">{service.name}</p>
                    </div>
                    <span className="text-[11px] font-bold text-[#111118] tabular-nums shrink-0">
                      ₹{service.revenue.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-black/[0.05] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${service.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: i * 0.08 }}
                        className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C9A227]"
                      />
                    </div>
                    <span className="text-[10px] text-[#9a9a9a] w-14 text-right shrink-0">
                      {service.bookings} bkgs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </motion.div>
      </div>
    </section>
  );
}
