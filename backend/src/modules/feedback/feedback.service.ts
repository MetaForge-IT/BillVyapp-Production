import type { AuthContext } from "../auth/auth.types";
import { appNotificationGenerator } from "../app-notifications/app-notifications.generator";
import { feedbackRepository } from "./feedback.repository";
import type { CreateFeedbackInput, UpdateFeedbackInput } from "./feedback.validators";

export class FeedbackService {
  list(
    auth: AuthContext,
    filters?: {
      rating?: number;
      minRating?: number;
      maxRating?: number;
      status?: string;
      search?: string;
    },
  ) {
    return feedbackRepository.list(auth.salonId, filters);
  }

  stats(auth: AuthContext) {
    return feedbackRepository.getStats(auth.salonId);
  }

  getById(auth: AuthContext, feedbackId: string) {
    return feedbackRepository.getByPublicId(auth.salonId, feedbackId);
  }

  async create(auth: AuthContext, input: CreateFeedbackInput) {
    const feedback = await feedbackRepository.create(auth, input);

    void appNotificationGenerator
      .notifyNewFeedback({
        salonId: auth.salonId,
        feedbackId: feedback.id,
        customerName: feedback.customer,
        rating: feedback.rating,
        serviceName: feedback.service,
      })
      .catch(() => {});

    if (feedback.rating <= 2) {
      void appNotificationGenerator
        .notifyLowRatingFeedback({
          salonId: auth.salonId,
          feedbackId: feedback.id,
          customerName: feedback.customer,
          rating: feedback.rating,
          serviceName: feedback.service,
        })
        .catch(() => {});
    }

    return feedback;
  }

  update(auth: AuthContext, feedbackId: string, input: UpdateFeedbackInput) {
    return feedbackRepository.update(auth, feedbackId, input);
  }

  delete(auth: AuthContext, feedbackId: string) {
    return feedbackRepository.delete(auth, feedbackId);
  }
}

export const feedbackService = new FeedbackService();
