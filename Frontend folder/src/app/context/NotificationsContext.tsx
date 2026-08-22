import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { toast } from "../components/ui/hot-toast";
import {
  deleteNotification,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications";
import { getApiErrorMessage, ApiError } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import type { AppNotification, NotificationCategory } from "../components/layout/header/types";

const REFRESH_INTERVAL_MS = 60_000;

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: (opts?: { unreadOnly?: boolean; category?: NotificationCategory; silent?: boolean }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  handleNotificationClick: (notification: AppNotification, onClose?: () => void) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const authReady = useAuthStore((s) => s.isReady);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: {
    unreadOnly?: boolean;
    category?: NotificationCategory;
    silent?: boolean;
  }) => {
    const sessionOk = await useAuthStore.getState().ensureFreshAccessToken();
    if (!sessionOk) {
      setLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const [items, count] = await Promise.all([
        fetchNotifications({
          unreadOnly: opts?.unreadOnly,
          category: opts?.category,
        }),
        fetchUnreadNotificationCount(),
      ]);
      setNotifications(items);
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setNotifications([]);
        setUnreadCount(0);
        setError(null);
        return;
      }
      const message = getApiErrorMessage(err, "Failed to load notifications");
      setError(message);
      if (!opts?.silent) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady || !accessToken) {
      if (authReady && !accessToken) setLoading(false);
      return;
    }
    void refresh({ silent: true });
    const intervalId = window.setInterval(() => {
      void refresh({ silent: true });
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [authReady, accessToken, refresh]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationRead(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to mark notification as read"));
      void refresh({ silent: true });
    }
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to mark all as read"));
      void refresh({ silent: true });
    }
  }, [refresh]);

  const dismiss = useCallback(async (id: string) => {
    setNotifications((prev) => {
      const removed = prev.find((n) => n.id === id);
      if (removed && !removed.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.filter((n) => n.id !== id);
    });

    try {
      await deleteNotification(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to dismiss notification"));
      void refresh({ silent: true });
    }
  }, [refresh]);

  const handleNotificationClick = useCallback(
    (notification: AppNotification, onClose?: () => void) => {
      void markAsRead(notification.id);
      if (notification.href) {
        navigate(notification.href);
        onClose?.();
      }
    },
    [markAsRead, navigate],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      refresh,
      markAsRead,
      markAllAsRead,
      dismiss,
      handleNotificationClick,
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      refresh,
      markAsRead,
      markAllAsRead,
      dismiss,
      handleNotificationClick,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotificationsContext must be used within NotificationsProvider");
  }
  return ctx;
}
