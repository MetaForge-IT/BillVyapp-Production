import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { appNotificationsController } from "./app-notifications.controller";
import { createNotificationSchema } from "./app-notifications.validators";

const appNotificationsRouter = Router();

function validateRequest(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: issue.path.length > 0 ? issue.path.join(".") : "body",
          message: issue.message,
        }));
        next(new BadRequestError("Validation failed", errors));
        return;
      }
      next(error);
    }
  };
}

appNotificationsRouter.use(authenticate);

appNotificationsRouter.get("/unread-count", appNotificationsController.unreadCount);
appNotificationsRouter.patch("/read-all", appNotificationsController.markAllRead);
appNotificationsRouter.get("/", appNotificationsController.list);
appNotificationsRouter.post("/", validateRequest(createNotificationSchema), appNotificationsController.create);
appNotificationsRouter.patch("/:notificationId/read", appNotificationsController.markRead);
appNotificationsRouter.delete("/:notificationId", appNotificationsController.delete);

export { appNotificationsRouter };
