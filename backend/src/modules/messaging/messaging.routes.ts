import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { messagingController } from "./messaging.controller";
import {
  sendBirthdayOfferWhatsAppSchema,
  sendCouponWhatsAppSchema,
  sendFeedbackRequestWhatsAppSchema,
} from "./messaging.validators";

const messagingRouter = Router();

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
