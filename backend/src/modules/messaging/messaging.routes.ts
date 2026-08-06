import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { messagingController } from "./messaging.controller";
import {
  sendBirthdayOfferWhatsAppSchema,
  sendCouponWhatsAppSchema,
  sendFeedbackRequestWhatsAppSchema,
} from "./messaging.validators";

const messagingRouter = Router();

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

messagingRouter.use(authenticate);

messagingRouter.post(
  "/whatsapp/coupon",
  validateRequest(sendCouponWhatsAppSchema),
  messagingController.sendCouponWhatsApp,
);

messagingRouter.post(
  "/whatsapp/feedback-request",
  validateRequest(sendFeedbackRequestWhatsAppSchema),
  messagingController.sendFeedbackRequestWhatsApp,
);

messagingRouter.post(
  "/whatsapp/birthday-offer",
  validateRequest(sendBirthdayOfferWhatsAppSchema),
  messagingController.sendBirthdayOfferWhatsApp,
);

export { messagingRouter };
