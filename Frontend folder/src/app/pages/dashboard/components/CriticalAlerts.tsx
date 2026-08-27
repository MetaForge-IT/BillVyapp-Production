import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { DashboardCard, DashboardCardHeader, SectionLabel } from "./DashboardCard";
import { useNotificationsContext } from "../../../context/NotificationsContext";
import { notificationCategoryConfig } from "../../../components/layout/header/types";
import { DASHBOARD_VIEWPORT, dashboardFadeUp } from "../motion";

/** Dashboard alerts fed from Notification Center (DB-backed). */
export function CriticalAlerts() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, handleNotificationClick } = useNotificationsContext();

  const alerts = notifications
    .filter((n) => !n.read)
    .slice(0, 5);
  const urgentCount = alerts.filter((a) =>
    a.category === "warning" || a.category === "payment" || a.category === "inventory",
  ).length;

  return (
    <section aria-label="Critical alerts" className="h-full flex flex-col">
      <SectionLabel>Alerts &amp; Notifications</SectionLabel>
      <motion.div variants={dashboardFadeUp} initial="hidden" whileInView="show" viewport={DASHBOARD_VIEWPORT} className="flex-1 min-h-0">
        <DashboardCard className="h-full">
          <DashboardCardHeader
            icon={Bell}
            title="Needs Attention"
            badge={urgentCount > 0 ? `${urgentCount} urgent` : unreadCount > 0 ? `${unreadCount} unread` : undefined}
          />
          <div className="p-3 space-y-2">
            {loading && alerts.length === 0 ? (
              <p className="text-[12px] text-[#3f3f46] text-center py-6">Loading alerts...</p>
            ) : alerts.length === 0 ? (
              <p className="text-[12px] text-[#3f3f46] text-center py-6">No alerts right now</p>
            ) : alerts.map((alert) => {
              const cfg = notificationCategoryConfig[alert.category] ?? notificationCategoryConfig.system;
              const Icon = cfg.icon;
              const urgent =
                alert.category === "warning" ||
                alert.category === "payment" ||
                alert.category === "inventory";
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => handleNotificationClick(alert)}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors hover:border-[#D4AF37]/40 ${
                    urgent
                      ? "bg-[#111118]/[0.03] border-[#111118]/[0.09]"
                      : "bg-[#f4f2ed] border-[#D4AF37]/12"
                  }`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                    urgent
                      ? "bg-[#D4AF37]/12 border border-[#D4AF37]/22"
                      : "bg-black/[0.04] border border-black/[0.07]"
                  }`}>
                    <Icon className={`h-3.5 w-3.5 ${urgent ? "text-[#D4AF37]" : "text-[#52525b]"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-[#111118] leading-snug">{alert.title}</p>
                      {urgent && (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#D4AF37]/12 text-[#B8962E] border border-[#D4AF37]/20">
                          Action needed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#3f3f46] mt-0.5 leading-snug">{alert.message}</p>
                    <p className="text-[10px] text-[#52525b] mt-1">{alert.timestamp}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => navigate("/notifications")}
              className="w-full py-2.5 rounded-xl text-[12px] font-semibold text-[#111118] bg-[#f4f2ed] border border-black/[0.07] hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/05 transition-all"
            >
              View All Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
          </div>
        </DashboardCard>
      </motion.div>
    </section>
  );
}
