import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Activity, Scissors } from "lucide-react";
import { DashboardCard, DashboardCardHeader, SectionLabel } from "./DashboardCard";
import { useDashboard } from "../useDashboard";
import { cn } from "../../../components/ui/utils";
import { DASHBOARD_VIEWPORT, dashboardFadeUp } from "../motion";

/** Today's floor snapshot + most-booked services (bookings only, no revenue). */
export function FloorStatusPanel() {
  const navigate = useNavigate();
  const { data } = useDashboard();
  const k = data?.businessKpis;
  const analytics = data?.appointmentAnalytics;
  const topBooked = data?.serviceAnalytics?.mostBookedServices?.slice(0, 4) ?? [];

  const chips = [
    {
      label: "Booked",
      value: analytics?.bookedAppointments ?? 0,
      href: "/appointments",
      tone: "gold" as const,
    },
    {
      label: "Walk-ins",
      value: k?.walkInCount ?? 0,
      href: "/appointments?type=walk-in",
      tone: "neutral" as const,
    },
    {
      label: "Checked in",
      value: k?.checkedInToday ?? 0,
      href: "/appointments",
      tone: "gold" as const,
    },
    {
      label: "Completed",
      value: analytics?.completed ?? 0,
      href: "/appointments",
      tone: "neutral" as const,
    },
    {
      label: "Pending",
      value: analytics?.pending ?? 0,
      href: "/appointments",
      tone: "warn" as const,
    },
    {
      label: "No-shows",
      value: k?.noShowsToday ?? 0,
      href: "/appointments",
      tone: "warn" as const,
    },
  ];

  const maxBookings = Math.max(1, ...topBooked.map((s) => s.bookings));

  return (
    <section aria-label="Floor status" className="flex h-full flex-col">
      <SectionLabel>Floor Status</SectionLabel>
      <motion.div variants={dashboardFadeUp} initial="hidden" whileInView="show" viewport={DASHBOARD_VIEWPORT} className="min-h-0 flex-1">
        <DashboardCard className="h-full">
          <DashboardCardHeader
            icon={Activity}
            title="Today on the floor"
            badge={`${k?.todayAppointments ?? 0} total`}
            action="Schedule"
            onAction={() => navigate("/appointments")}
          />
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => navigate(chip.href)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition-colors hover:border-[#D4AF37]/40",
                  chip.tone === "gold" && "border-[#D4AF37]/20 bg-[#D4AF37]/08",
                  chip.tone === "warn" && chip.value > 0
                    ? "border-[#111118]/15 bg-[#111118]/[0.03]"
                    : chip.tone === "warn"
                      ? "border-black/[0.06] bg-[#f4f2ed]"
                      : "border-black/[0.06] bg-[#f4f2ed]",
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">{chip.label}</p>
                <p className="mt-0.5 text-[20px] font-bold tabular-nums tracking-tight text-[#111118]">{chip.value}</p>
              </button>
            ))}
          </div>

          <div className="border-t border-black/[0.05] px-4 py-3">
            <div className="mb-2.5 flex items-center gap-2">
              <Scissors className="h-3.5 w-3.5 text-[#D4AF37]" />
              <p className="text-[12px] font-semibold text-[#111118]">Most booked services</p>
            </div>
            {topBooked.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-[#9a9a9a]">No service bookings this week yet</p>
            ) : (
              <div className="space-y-2">
                {topBooked.map((service) => (
                  <div key={service.name} className="min-w-0">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-medium text-[#111118]">{service.name}</p>
                      <span className="shrink-0 text-[11px] font-bold tabular-nums text-[#6b6b6b]">
                        {service.bookings}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.05]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C9A227]"
                        style={{ width: `${Math.round((service.bookings / maxBookings) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardCard>
      </motion.div>
    </section>
  );
}
