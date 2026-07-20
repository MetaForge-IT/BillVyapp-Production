import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { appNotificationsService } from "./app-notifications.service";
import type { CreateNotificationInput } from "./app-notifications.validators";

export class AppNotificationsController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const { category, unreadOnly } = req.query;
    const notifications = await appNotificationsService.list(auth, {
      category: typeof category === "string" ? category : undefined,
      unreadOnly: unreadOnly === "true",
    });
    sendSuccess(res, { message: "Notifications retrieved", data: notifications });
  });

  unreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const count = await appNotificationsService.unreadCount(auth);
    sendSuccess(res, { message: "Unread count retrieved", data: { count } });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateNotificationInput;
    const notification = await appNotificationsService.create(auth, body);
    sendCreated(res, { message: "Notification created", data: notification });
  });

  markRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const notification = await appNotificationsService.markRead(
      auth,
      String(req.params.notificationId),
    );
    sendSuccess(res, { message: "Notification marked as read", data: notification });
  });

  markAllRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const result = await appNotificationsService.markAllRead(auth);
    sendSuccess(res, { message: "All notifications marked as read", data: result });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await appNotificationsService.delete(auth, String(req.params.notificationId));
    sendNoContent(res);
  });
}

export const appNotificationsController = new AppNotificationsController();
