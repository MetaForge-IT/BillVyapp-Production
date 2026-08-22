import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { appNotificationsController } from "./app-notifications.controller";
import { createNotificationSchema } from "./app-notifications.validators";

const appNotificationsRouter = Router();

appNotificationsRouter.use(authenticate);

appNotificationsRouter.get("/unread-count", appNotificationsController.unreadCount);
appNotificationsRouter.patch("/read-all", appNotificationsController.markAllRead);
appNotificationsRouter.get("/", appNotificationsController.list);
appNotificationsRouter.post("/", validateRequest(createNotificationSchema), appNotificationsController.create);
appNotificationsRouter.patch("/:notificationId/read", appNotificationsController.markRead);
appNotificationsRouter.delete("/:notificationId", appNotificationsController.delete);

export { appNotificationsRouter };
