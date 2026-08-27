import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { cn } from "../../ui/utils";
import {
  notificationCategoryConfig,
  type AppNotification,
} from "./types";

interface NotificationPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  visible: AppNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: AppNotification) => void;
  compact?: boolean;
  hideTrigger?: boolean;
  variant?: "header" | "sidebar";
  collapsed?: boolean;
  onNavigate?: () => void;
}

const panelMotion = {
  initial: { opacity: 0, y: 10, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.96 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
};

export function NotificationPanel({
  isOpen,
  onToggle,
  onClose,
  visible,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  compact,
  hideTrigger,
  variant = "header",
  collapsed = false,
  onNavigate,
}: NotificationPanelProps) {
  const navigate = useNavigate();
  const isSidebar = variant === "sidebar";

  const panelPositionClass = isSidebar
    ? "left-full bottom-0 ml-2"
    : "right-0 mt-2.5";

  const panelWidthClass = isSidebar
    ? "w-[min(calc(100vw-5rem),360px)]"
    : "w-[min(100vw-2rem,380px)]";

  const panel = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          {...panelMotion}
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "absolute z-[100] overflow-hidden rounded-2xl border border-black/[0.08] bg-white/95 shadow-[0_24px_64px_rgba(17,17,24,0.14)] backdrop-blur-xl",
            panelPositionClass,
            panelWidthClass,
          )}
        >
          <div className="border-b border-black/[0.06] bg-gradient-to-b from-white to-[#faf9f7] px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#111118] tracking-[-0.01em]">Notifications</h3>
                <p className="text-[11px] text-[#52525b] mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain p-2">
            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-[#111118]">No notifications</p>
                <p className="text-xs text-[#52525b] mt-1">We'll let you know when something needs attention.</p>
              </div>
            ) : (
              <ul className="space-y-1" role="list">
                {visible.map((notification) => {
                  const config = notificationCategoryConfig[notification.category];
                  const Icon = config.icon;

                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => onNotificationClick(notification)}
                        className={cn(
                          "group w-full rounded-xl border p-3 text-left transition-all duration-200",
                          "hover:shadow-sm hover:border-black/[0.08]",
                          notification.read
                            ? "border-transparent bg-transparent hover:bg-[#f4f2ed]/80"
                            : cn(config.bg, config.border, "shadow-[inset_3px_0_0_0_currentColor]", config.accent),
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                              config.bg,
                              config.border,
                            )}
                          >
                            <Icon className={cn("h-4 w-4", config.accent)} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  "text-[13px] leading-snug",
                                  notification.read
                                    ? "font-medium text-[#111118]"
                                    : "font-semibold text-[#111118]",
                                )}
                              >
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                              )}
                            </div>
                            <p className="text-[12px] text-[#3f3f46] mt-0.5 leading-snug line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#52525b]">
                                {config.label} · {notification.timestamp}
                              </span>
                              {!notification.read && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkAsRead(notification.id);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onMarkAsRead(notification.id);
                                    }
                                  }}
                                  className="text-[10px] font-semibold text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                                >
                                  Mark read
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-black/[0.06] bg-[#faf9f7]/80 px-3 py-2.5">
            <button
              type="button"
              onClick={() => {
                navigate("/notifications");
                onClose();
                onNavigate?.();
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-[#111118] hover:bg-white transition-colors"
            >
              View all notifications
              <ExternalLink className="h-3.5 w-3.5 text-[#52525b]" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (hideTrigger) {
    return panel;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className={cn(
          "relative flex items-center justify-center rounded-xl border transition-all duration-200",
          compact ? "h-9 w-9" : "h-9 w-9",
          isSidebar
            ? isOpen
              ? "border-[#D4AF37]/40 bg-[#D4AF37]/15 text-[#D4AF37]"
              : "border-[#D4AF37]/20 bg-white/[0.04] text-[#D4AF37] hover:bg-white/[0.08]"
            : isOpen
              ? "border-[#D4AF37]/35 bg-[#D4AF37]/08 text-[#111118] shadow-[0_0_0_3px_rgba(212,175,55,0.12)]"
              : "border-black/[0.08] bg-white/80 text-[#111118] hover:bg-white hover:shadow-sm",
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className={cn(
            "absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E07A5F] px-1 text-[10px] font-bold text-white shadow-sm",
            isSidebar ? "ring-2 ring-[#0a0a10]" : "ring-2 ring-white",
          )}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
