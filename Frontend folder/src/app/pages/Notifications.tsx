import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CheckCheck, ExternalLink, Trash2,
  AlertTriangle, Calendar, CheckCircle2, Package, Settings, Wallet,
} from "lucide-react";
import { cn } from "../components/ui/utils";
import {
  notificationCategoryConfig,
  type AppNotification,
  type NotificationCategory,
} from "../components/layout/header/types";
import {
  financePanel,
  financeIconWrap,
  financeBadgeGold,
  financePrimaryBtn,
} from "./finance/finance-ui";
import { SEGMENTED_PILL_LIST } from "../components/layout/segmented-nav";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import { useNotificationsContext } from "../context/NotificationsContext";

const CATEGORIES: { key: "all" | NotificationCategory; label: string; icon: React.ElementType }[] = [
  { key: "all",         label: "All",          icon: Bell          },
  { key: "warning",     label: "Warnings",     icon: AlertTriangle },
  { key: "appointment", label: "Appointments", icon: Calendar      },
  { key: "payment",     label: "Payments",     icon: Wallet        },
  { key: "inventory",   label: "Inventory",    icon: Package       },
  { key: "success",     label: "Success",      icon: CheckCircle2  },
  { key: "system",      label: "System",       icon: Settings      },
];

export function Notifications() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    dismiss,
    handleNotificationClick,
  } = useNotificationsContext();

  const [activeTab, setActiveTab] = useState<"all" | NotificationCategory>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Keep Alerts in sync with DB when opening the page
  useEffect(() => {
    void refresh({ silent: true });
  }, [refresh]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (showUnreadOnly && n.read) return false;
      if (activeTab !== "all" && n.category !== activeTab) return false;
      return true;
    });
  }, [notifications, activeTab, showUnreadOnly]);

  const { page, setPage, pageSize, setPageSize, paginate } = useTablePagination(
    filtered.length,
    [activeTab, showUnreadOnly, notifications.length],
  );
  const paginated = useMemo(() => paginate(filtered), [filtered, paginate]);

  const handleClick = (n: AppNotification) => {
    handleNotificationClick(n);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">Notification Center</p>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent">
            Alerts
          </h1>
          <p className="text-muted-foreground mt-1">
            {loading
              ? "Loading notifications from server..."
              : error
                ? error
                : unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                  : "You're all caught up!"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void refresh()}
            className="h-8 px-3 rounded-xl text-[11px] font-semibold border border-black/[0.08] bg-white text-[#3f3f46] hover:border-[#D4AF37]/35 transition-all"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowUnreadOnly((v) => !v)}
            className={cn(
              "h-8 px-3 rounded-xl text-[11px] font-semibold border transition-all",
              showUnreadOnly
                ? "bg-[#121212] text-[#D4AF37] border-[#D4AF37]/30"
                : "bg-white text-[#3f3f46] border-black/[0.08] hover:border-[#D4AF37]/35",
            )}
          >
            Unread only
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              className={`${financePrimaryBtn} h-8 px-3 text-[11px] inline-flex items-center gap-1.5`}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="stat-grid-3">
        {[
          { label: "Total", value: notifications.length },
          { label: "Unread", value: unreadCount },
          { label: "Showing", value: filtered.length },
        ].map((s) => (
          <div key={s.label} className={`${financePanel} flex items-center gap-3 p-3`}>
            <div className={`${financeIconWrap} h-8 w-8`}>
              <Bell className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#3f3f46]">{s.label}</p>
              <p className="text-lg font-bold text-[#111118] tabular-nums leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={cn(SEGMENTED_PILL_LIST, "w-full max-w-full flex-wrap h-auto gap-1.5 p-1.5")}>
        {CATEGORIES.map((cat) => {
          const unread =
            cat.key === "all"
              ? unreadCount
              : notifications.filter((n) => n.category === cat.key && !n.read).length;
          const Icon = cat.icon;
          const active = activeTab === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveTab(cat.key)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-transparent px-3 text-[11px] font-semibold whitespace-nowrap transition-all",
                active
                  ? "bg-[#121212] text-[#D4AF37] shadow-sm"
                  : "bg-transparent text-[#3f3f46] hover:bg-[#FAF8F2] hover:text-[#111118]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
              {unread > 0 && (
                <span
                  className={cn(
                    "h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center",
                    active ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-black/[0.06] text-[#3f3f46]",
                  )}
                >
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {filtered.length === 0 && !loading && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`${financePanel} flex flex-col items-center py-12 text-center`}
            >
              <div className={`${financeIconWrap} h-12 w-12 mb-3`}>
                <Bell className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <p className="font-semibold text-[#111118] text-sm">No notifications</p>
              <p className="text-xs text-[#52525b] mt-1">
                {error ? "Could not reach the server. Try Refresh." : "You're all caught up!"}
              </p>
            </motion.div>
          )}

          {paginated.map((n, i) => {
            const cfg = notificationCategoryConfig[n.category] ?? notificationCategoryConfig.system;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40, scale: 0.98 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
                onClick={() => handleClick(n)}
                className={cn(
                  financePanel,
                  "group relative flex cursor-pointer items-start gap-3 p-3 transition-all hover:shadow-md",
                  !n.read && "ring-1 ring-[#D4AF37]/25 border-[#D4AF37]/20",
                )}
              >
                {!n.read && (
                  <span className="absolute top-3 right-9 h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                )}

                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border", cfg.bg, cfg.border)}>
                  <Icon className={cn("h-3.5 w-3.5", cfg.accent)} />
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p
                      className={cn(
                        "text-[12px] font-semibold leading-snug",
                        n.read ? "text-[#52525b]" : "text-[#111118]",
                      )}
                    >
                      {n.title}
                    </p>
                    <span className="text-[10px] text-[#52525b] whitespace-nowrap shrink-0">{n.timestamp}</span>
                  </div>

                  <p className="text-[11px] text-[#3f3f46] leading-relaxed line-clamp-2">{n.message}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(financeBadgeGold, "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold")}>
                      <Icon className="h-2.5 w-2.5" />
                      {cfg.label}
                    </span>
                    {!n.read && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void markAsRead(n.id);
                        }}
                        className="text-[10px] text-[#52525b] hover:text-[#D4AF37] font-medium transition-colors"
                      >
                        Mark read
                      </button>
                    )}
                    {n.href && (
                      <span className="ml-auto text-[10px] text-[#D4AF37] font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-3 w-3" /> Open
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void dismiss(n.id);
                  }}
                  className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded-lg bg-[#FAF8F2] hover:bg-[#121212]/5 text-[#52525b] hover:text-[#111118] border border-black/[0.06]"
                  title="Dismiss"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalRecords={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </motion.div>
  );
}
