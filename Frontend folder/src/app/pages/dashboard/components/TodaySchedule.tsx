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
    <section aria-label="Today's schedule" className="flex h-full min-w-0 max-w-full flex-col">
      <SectionLabel>Today&apos;s Schedule</SectionLabel>
      <motion.div
        variants={dashboardFadeUp}
        initial="hidden"
        whileInView="show"
        viewport={DASHBOARD_VIEWPORT}
        className="min-h-0 min-w-0 max-w-full flex-1"
      >
        <DashboardCard className="h-full min-w-0">
          <DashboardCardHeader
            icon={Calendar}
            title="Upcoming Appointments"
            badge="Next 5"
            action="View All"
            onAction={() => navigate(todayKey ? `/appointments?date=${todayKey}` : "/appointments")}
          />
          <div className="min-w-0 divide-y divide-black/[0.04]">
            {upcomingAppointments.length === 0 ? (
              <p className="px-3 py-10 text-center text-[12px] text-[#52525b] sm:px-5">
                No upcoming appointments scheduled
              </p>
            ) : (
              upcomingAppointments.map((apt, i) => (
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
                  className="group flex w-full min-w-0 max-w-full items-center gap-2 px-3 py-3 text-left transition-colors hover:bg-[#f4f2ed]/60 sm:gap-4 sm:px-5 sm:py-3.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[11px] font-bold text-[#111118] shadow-sm">
                    {apt.avatar}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-[13px] font-semibold text-[#111118]">{apt.customer}</p>
                    <p className="truncate text-[11px] text-[#52525b]">{apt.service}</p>
                  </div>
                  <div className="w-[30%] min-w-0 shrink text-right sm:w-auto sm:max-w-[42%] sm:shrink-0">
                    <p className="truncate text-[12px] font-bold text-[#111118] sm:text-[13px]">
                      {formatScheduleWhen(apt)}
                    </p>
                    <p className="truncate text-[10px] text-[#52525b]">{apt.duration}</p>
                  </div>
                  <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-[#52525b] opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
                </motion.button>
              ))
            )}
          </div>
        </DashboardCard>
      </motion.div>
    </section>
  );
}
