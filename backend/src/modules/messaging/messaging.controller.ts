import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { messagingService } from "./messaging.service";
import type {
  SendBirthdayOfferWhatsAppInput,
  SendCouponWhatsAppInput,
  SendFeedbackRequestWhatsAppInput,
} from "./messaging.validators";

export class MessagingController {
  sendCouponWhatsApp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SendCouponWhatsAppInput;
    const result = await messagingService.sendCouponWhatsApp(body);
    sendSuccess(res, {
      message: "Coupon WhatsApp message queued",
      data: result,
    });
  });

  sendFeedbackRequestWhatsApp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SendFeedbackRequestWhatsAppInput;
    const result = await messagingService.sendFeedbackRequestWhatsApp(body);
    sendSuccess(res, {
      message: "Feedback request WhatsApp message queued",
      data: result,
    });
  });

  sendBirthdayOfferWhatsApp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SendBirthdayOfferWhatsAppInput;
    const result = await messagingService.sendBirthdayOfferWhatsApp(body);
    sendSuccess(res, {
      message: "Birthday offer WhatsApp message queued",
      data: result,
    });
  });
}

export const messagingController = new MessagingController();
