import { useNotificationsContext } from "../../../context/NotificationsContext";

/**
 * Thin wrapper so header/sidebar keep importing from this path.
 * Data comes from NotificationsContext (live backend /notifications API).
 */
export function useNotifications() {
  const ctx = useNotificationsContext();
  return {
    visible: ctx.notifications,
    unreadCount: ctx.unreadCount,
    loading: ctx.loading,
    error: ctx.error,
    refresh: ctx.refresh,
    markAsRead: ctx.markAsRead,
    markAllAsRead: ctx.markAllAsRead,
    dismiss: ctx.dismiss,
    handleNotificationClick: ctx.handleNotificationClick,
  };
}
