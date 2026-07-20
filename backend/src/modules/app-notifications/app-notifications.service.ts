import type { AuthContext } from "../auth/auth.types";
import { appNotificationGenerator } from "./app-notifications.generator";
import { appNotificationsRepository } from "./app-notifications.repository";
import type { CreateNotificationInput } from "./app-notifications.validators";

export class AppNotificationsService {
  async list(
    auth: AuthContext,
    filters?: { category?: string; unreadOnly?: boolean },
  ) {
    await appNotificationGenerator.syncAutomatedNotifications(auth.salonId);
    return appNotificationsRepository.list(auth.salonId, filters);
  }

  unreadCount(auth: AuthContext) {
    // Keep badge in sync with live business state (pending bills, stock, etc.)
    return appNotificationGenerator
      .syncAutomatedNotifications(auth.salonId)
      .then(() => appNotificationsRepository.unreadCount(auth.salonId));
  }

  create(auth: AuthContext, input: CreateNotificationInput) {
    return appNotificationsRepository.create(auth.salonId, input);
  }

  markRead(auth: AuthContext, notificationId: string) {
    return appNotificationsRepository.markRead(auth.salonId, notificationId);
  }

  markAllRead(auth: AuthContext) {
    return appNotificationsRepository.markAllRead(auth.salonId);
  }

  delete(auth: AuthContext, notificationId: string) {
    return appNotificationsRepository.delete(auth.salonId, notificationId);
  }
}

export const appNotificationsService = new AppNotificationsService();
