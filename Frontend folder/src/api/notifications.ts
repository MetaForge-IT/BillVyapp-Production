import { apiClient } from "../lib/axios";
import type {
  AppNotification,
  NotificationCategory,
} from "../app/components/layout/header/types";

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  read: boolean;
  href?: string;
  referenceType?: string;
  referenceId?: string;
  timestamp: string;
  createdAt: string;
  readAt: string | null;
}

function mapNotification(dto: NotificationDto): AppNotification {
  return {
    id: dto.id,
    title: dto.title,
    message: dto.message,
    timestamp: dto.timestamp,
    category: dto.category,
    read: dto.read,
    href: dto.href,
  };
}

export async function fetchNotifications(filters?: {
  category?: NotificationCategory;
  unreadOnly?: boolean;
}): Promise<AppNotification[]> {
  const params: Record<string, string> = {};
  if (filters?.category) params.category = filters.category;
  if (filters?.unreadOnly) params.unreadOnly = "true";

  const { data } = await apiClient.get<ApiEnvelope<NotificationDto[]>>("/notifications", {
    params,
  });
  return data.data.map(mapNotification);
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data } = await apiClient.get<ApiEnvelope<{ count: number }>>(
    "/notifications/unread-count",
  );
  return data.data.count;
}

export async function markNotificationRead(notificationId: string): Promise<AppNotification> {
  const { data } = await apiClient.patch<ApiEnvelope<NotificationDto>>(
    `/notifications/${notificationId}/read`,
  );
  return mapNotification(data.data);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch("/notifications/read-all");
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await apiClient.delete(`/notifications/${notificationId}`);
}
