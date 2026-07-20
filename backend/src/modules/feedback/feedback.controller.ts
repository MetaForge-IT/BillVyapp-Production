import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { feedbackService } from "./feedback.service";
import type { CreateFeedbackInput, UpdateFeedbackInput } from "./feedback.validators";

export class FeedbackController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const { rating, status, search, ratingRange } = req.query;

    let minRating: number | undefined;
    let maxRating: number | undefined;
    if (ratingRange === "1-2") {
      minRating = 1;
      maxRating = 2;
    }

    const feedbacks = await feedbackService.list(auth, {
      rating: typeof rating === "string" ? Number.parseInt(rating, 10) : undefined,
      minRating,
      maxRating,
      status: typeof status === "string" ? status : undefined,
      search: typeof search === "string" ? search : undefined,
    });
    sendSuccess(res, { message: "Feedback retrieved", data: feedbacks });
  });

  stats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const stats = await feedbackService.stats(auth);
    sendSuccess(res, { message: "Feedback stats retrieved", data: stats });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const feedback = await feedbackService.getById(auth, String(req.params.feedbackId));
    sendSuccess(res, { message: "Feedback retrieved", data: feedback });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreateFeedbackInput;
    const feedback = await feedbackService.create(auth, body);
    sendCreated(res, { message: "Feedback created", data: feedback });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdateFeedbackInput;
    const feedback = await feedbackService.update(auth, String(req.params.feedbackId), body);
    sendSuccess(res, { message: "Feedback updated", data: feedback });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    await feedbackService.delete(auth, String(req.params.feedbackId));
    sendNoContent(res);
  });
}

export const feedbackController = new FeedbackController();
