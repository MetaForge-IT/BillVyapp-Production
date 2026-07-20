import type { Notification } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/errors";
import { NOTIFICATION_ERROR_CODES } from "./app-notifications.constants";
import type { CreateNotificationInput } from "./app-notifications.validators";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function mapNotification(notification: Notification) {
  return {
    id: notification.publicId,
    title: notification.title,
    message: notification.message,
    category: notification.category,
    read: notification.isRead,
    href: notification.actionHref ?? undefined,
    referenceType: notification.referenceType ?? undefined,
    referenceId: notification.referenceId ?? undefined,
    timestamp: formatRelativeTime(notification.createdAt),
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
  };
}

export class AppNotificationsRepository {
  async list(salonId: string, filters?: { category?: string; unreadOnly?: boolean }) {
    const notifications = await prisma.notification.findMany({
      where: {
        salonId,
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return notifications.map(mapNotification);
  }

  async unreadCount(salonId: string) {
    return prisma.notification.count({
      where: { salonId, isRead: false },
    });
  }

  async getByPublicId(salonId: string, publicId: string) {
    const notification = await prisma.notification.findFirst({
      where: { publicId, salonId },
    });
    if (!notification) {
      throw new AppError(404, "Notification not found", {
        code: NOTIFICATION_ERROR_CODES.NOT_FOUND,
      });
    }
    return mapNotification(notification);
  }

  async create(
    salonId: string,
    input: CreateNotificationInput,
  ) {
    const notification = await prisma.notification.create({
      data: {
        salonId,
        title: input.title,
        message: input.message,
        category: input.category,
        actionHref: input.actionHref ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
      },
    });
    return mapNotification(notification);
  }

  async createIfUnreadExists(params: {
    salonId: string;
    title: string;
    message: string;
    category: string;
    actionHref?: string;
    referenceType: string;
    referenceId: string;
  }) {
    const existing = await prisma.notification.findFirst({
      where: {
        salonId: params.salonId,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        isRead: false,
      },
    });
    if (existing) return mapNotification(existing);

    const notification = await prisma.notification.create({
      data: {
        salonId: params.salonId,
        title: params.title,
        message: params.message,
        category: params.category,
        actionHref: params.actionHref ?? null,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
      },
    });
    return mapNotification(notification);
  }

  async markRead(salonId: string, publicId: string) {
    const existing = await prisma.notification.findFirst({
      where: { publicId, salonId },
    });
    if (!existing) {
      throw new AppError(404, "Notification not found", {
        code: NOTIFICATION_ERROR_CODES.NOT_FOUND,
      });
    }
    const notification = await prisma.notification.update({
      where: { id: existing.id },
      data: { isRead: true, readAt: new Date() },
    });
    return mapNotification(notification);
  }

  async markAllRead(salonId: string) {
    const now = new Date();
    await prisma.notification.updateMany({
      where: { salonId, isRead: false },
      data: { isRead: true, readAt: now },
    });
    return { updated: true };
  }

  async delete(salonId: string, publicId: string) {
    const existing = await prisma.notification.findFirst({
      where: { publicId, salonId },
    });
    if (!existing) {
      throw new AppError(404, "Notification not found", {
        code: NOTIFICATION_ERROR_CODES.NOT_FOUND,
      });
    }
    await prisma.notification.delete({ where: { id: existing.id } });
  }
}

export const appNotificationsRepository = new AppNotificationsRepository();
