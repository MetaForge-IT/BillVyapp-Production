import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Calendar, ChevronRight } from "lucide-react";
import { DashboardCard, DashboardCardHeader, SectionLabel } from "./DashboardCard";
import { DASHBOARD_DURATION, DASHBOARD_EASE, DASHBOARD_VIEWPORT, dashboardFadeUp, dashboardItemDelay } from "../motion";
import { useDashboard } from "../useDashboard";
import { istDateKey } from "../../../../lib/istDate";

export function TodaySchedule() {
  const navigate = useNavigate();
  const { data } = useDashboard();
  const upcomingAppointments = data?.upcomingAppointments ?? [];
  const todayKey = istDateKey();

  const formatScheduleWhen = (apt: { date?: string; time: string }) => {
    if (!apt.date || apt.date === todayKey) return apt.time;
    const parsed = new Date(`${apt.date}T00:00:00`);
    const label = parsed.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    return `${label} · ${apt.time}`;
  };

  return (
    <section aria-label="Today's schedule" className="h-full flex flex-col">
      <SectionLabel>Today&apos;s Schedule</SectionLabel>
      <motion.div variants={dashboardFadeUp} initial="hidden" whileInView="show" viewport={DASHBOARD_VIEWPORT} className="flex-1 min-h-0">
        <DashboardCard className="h-full">
          <DashboardCardHeader
            icon={Calendar}
            title="Upcoming Appointments"
            badge="Next 5"
            action="View All"
            onAction={() => navigate(todayKey ? `/appointments?date=${todayKey}` : "/appointments")}
          />
          <div className="divide-y divide-black/[0.04]">
            {upcomingAppointments.length === 0 ? (
              <p className="text-[12px] text-[#9a9a9a] text-center py-10">No upcoming appointments scheduled</p>
            ) : upcomingAppointments.map((apt, i) => (
              <motion.button
                key={apt.id}
                type="button"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: DASHBOARD_DURATION,
                  delay: dashboardItemDelay(i, 0.28),
                  ease: DASHBOARD_EASE,
                }}
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("appointment", apt.id);
                  if (apt.date) params.set("date", apt.date);
                  navigate(`/appointments?${params.toString()}`);
                }}
                className="group w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[#f4f2ed]/60 transition-colors text-left"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-[#111118] bg-gradient-to-br from-[#D4AF37] to-[#C9A227] shadow-sm">
                  {apt.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#111118] truncate">{apt.customer}</p>
                  <p className="text-[11px] text-[#9a9a9a] truncate">{apt.service}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold text-[#111118]">{formatScheduleWhen(apt)}</p>
                  <p className="text-[10px] text-[#9a9a9a]">{apt.duration}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-[#9a9a9a] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </motion.button>
            ))}
          </div>
        </DashboardCard>
      </motion.div>
    </section>
  );
}
