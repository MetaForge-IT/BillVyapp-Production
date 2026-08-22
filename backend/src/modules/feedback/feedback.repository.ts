import type { Feedback } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { MAX_PAGE_LIMIT } from "../../utils/pagination";
import { AppError, ConflictError } from "../../utils/errors";
import type { AuthContext } from "../auth/auth.types";
import { APPOINTMENT_STATUS } from "../appointments/appointments.constants";
import {
  computeSentiment,
  FEEDBACK_ERROR_CODES,
  FEEDBACK_SENTIMENT,
  FEEDBACK_STATUS,
} from "./feedback.constants";
import type { CreateFeedbackInput, UpdateFeedbackInput } from "./feedback.validators";

type FeedbackWithRelations = Feedback & {
  customer: { id: string; fullName: string };
  appointment: {
    id: string;
    scheduledDate: Date;
    scheduledTime: Date;
    staffName: string | null;
    services: { itemName: string }[];
  } | null;
};

function formatFeedbackDate(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  const timeLabel = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (diffDays <= 0) return `Today, ${timeLabel}`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function mapFeedback(feedback: FeedbackWithRelations) {
  const sentiment =
    feedback.sentiment ??
    computeSentiment(feedback.rating);

  return {
    id: feedback.publicId,
    customerId: feedback.customerId,
    customer: feedback.customer.fullName,
    appointmentId: feedback.appointmentId ?? undefined,
    service: feedback.serviceName ?? feedback.appointment?.services[0]?.itemName ?? "",
    staff: feedback.staffName ?? feedback.appointment?.staffName ?? "",
    rating: feedback.rating as 1 | 2 | 3 | 4 | 5,
    comment: feedback.comment ?? "",
    date: formatFeedbackDate(feedback.createdAt),
    feedbackDate: feedback.createdAt.toISOString(),
    sentiment: sentiment as "positive" | "neutral" | "negative",
    status: feedback.status as "new" | "reviewed" | "resolved",
    replied: feedback.isReplied,
    replyText: feedback.replyText ?? undefined,
    source: feedback.source as "google" | "app" | "sms",
    createdAt: feedback.createdAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString(),
  };
}

const feedbackInclude = {
  customer: { select: { id: true, fullName: true } },
  appointment: {
    select: {
      id: true,
      scheduledDate: true,
      scheduledTime: true,
      staffName: true,
      services: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { itemName: true } },
    },
  },
} as const;

async function updateCustomerSatisfaction(salonId: string, customerId: string) {
  const agg = await prisma.feedback.aggregate({
    where: { salonId, customerId },
    _avg: { rating: true },
  });
  await prisma.customer.updateMany({
    where: { id: customerId, salonId },
    data: { avgSatisfaction: agg._avg.rating ?? 0 },
  });
}

export class FeedbackRepository {
  async list(
    salonId: string,
    filters?: {
      rating?: number;
      minRating?: number;
      maxRating?: number;
      status?: string;
      search?: string;
    },
  ) {
    const search = filters?.search?.trim().toLowerCase();

    const feedbacks = await prisma.feedback.findMany({
      where: {
        salonId,
        ...(filters?.rating ? { rating: filters.rating } : {}),
        ...(filters?.minRating && filters?.maxRating
          ? { rating: { gte: filters.minRating, lte: filters.maxRating } }
          : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(search
          ? {
              OR: [
                { customer: { fullName: { contains: search } } },
                { comment: { contains: search } },
                { serviceName: { contains: search } },
              ],
            }
          : {}),
      },
      include: feedbackInclude,
      orderBy: { createdAt: "desc" },
      take: MAX_PAGE_LIMIT,
    });

    return feedbacks.map(mapFeedback);
  }

  async getStats(salonId: string) {
    const [feedbacks, totalReviews] = await Promise.all([
      prisma.feedback.findMany({
        where: { salonId },
        select: { rating: true, sentiment: true, status: true, isReplied: true },
      }),
      prisma.feedback.count({ where: { salonId } }),
    ]);

    if (totalReviews === 0) {
      return {
        averageRating: 0,
        satisfactionPercent: 0,
        totalReviews: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        unrepliedCount: 0,
        newCount: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let unrepliedCount = 0;
    let newCount = 0;
    let ratingSum = 0;

    for (const item of feedbacks) {
      ratingSum += item.rating;
      const bucket = item.rating as 1 | 2 | 3 | 4 | 5;
      ratingDistribution[bucket] += 1;

      const sentiment = item.sentiment ?? computeSentiment(item.rating);
      if (sentiment === FEEDBACK_SENTIMENT.POSITIVE) positiveCount += 1;
      else if (sentiment === FEEDBACK_SENTIMENT.NEGATIVE) negativeCount += 1;
      else neutralCount += 1;

      if (!item.isReplied) unrepliedCount += 1;
      if (item.status === FEEDBACK_STATUS.NEW) newCount += 1;
    }

    return {
      averageRating: Math.round((ratingSum / totalReviews) * 10) / 10,
      satisfactionPercent: Math.round((positiveCount / totalReviews) * 100),
      totalReviews,
      positiveCount,
      negativeCount,
      neutralCount,
      unrepliedCount,
      newCount,
      ratingDistribution,
    };
  }

  async getByPublicId(salonId: string, publicId: string) {
    const feedback = await prisma.feedback.findFirst({
      where: { publicId, salonId },
      include: feedbackInclude,
    });
    if (!feedback) {
      throw new AppError(404, "Feedback not found", { code: FEEDBACK_ERROR_CODES.NOT_FOUND });
    }
    return mapFeedback(feedback);
  }

  async create(auth: AuthContext, input: CreateFeedbackInput) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: input.appointmentId, salonId: auth.salonId },
      include: {
        customer: { select: { id: true, fullName: true } },
        services: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });

    if (!appointment) {
      throw new AppError(404, "Appointment not found", {
        code: FEEDBACK_ERROR_CODES.APPOINTMENT_NOT_FOUND,
      });
    }

    if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
      throw new AppError(400, "Feedback can only be submitted for completed appointments", {
        code: FEEDBACK_ERROR_CODES.APPOINTMENT_NOT_COMPLETED,
      });
    }

    const existing = await prisma.feedback.findFirst({
      where: { appointmentId: input.appointmentId, salonId: auth.salonId },
    });
    if (existing) {
      throw new ConflictError("Feedback already exists for this appointment");
    }

    const sentiment = computeSentiment(input.rating);
    const feedback = await prisma.feedback.create({
      data: {
        salonId: auth.salonId,
        customerId: appointment.customerId,
        appointmentId: appointment.id,
        serviceName: appointment.services[0]?.itemName ?? null,
        staffName: appointment.staffName,
        rating: input.rating,
        comment: input.comment ?? null,
        sentiment,
        status: FEEDBACK_STATUS.NEW,
        source: input.source ?? "app",
      },
      include: feedbackInclude,
    });

    await updateCustomerSatisfaction(auth.salonId, appointment.customerId);

    return mapFeedback(feedback);
  }

  async update(auth: AuthContext, publicId: string, input: UpdateFeedbackInput) {
    const existing = await prisma.feedback.findFirst({
      where: { publicId, salonId: auth.salonId },
    });
    if (!existing) {
      throw new AppError(404, "Feedback not found", { code: FEEDBACK_ERROR_CODES.NOT_FOUND });
    }

    const now = new Date();
    const hasReply = input.replyText !== undefined && input.replyText.trim().length > 0;

    const feedback = await prisma.feedback.update({
      where: { id: existing.id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.replyText !== undefined
          ? {
              replyText: input.replyText.trim() || null,
              isReplied: hasReply,
              repliedAt: hasReply ? now : null,
              ...(hasReply && !input.status ? { status: FEEDBACK_STATUS.RESOLVED } : {}),
            }
          : {}),
      },
      include: feedbackInclude,
    });

    return mapFeedback(feedback);
  }

  async delete(auth: AuthContext, publicId: string) {
    const existing = await prisma.feedback.findFirst({
      where: { publicId, salonId: auth.salonId },
    });
    if (!existing) {
      throw new AppError(404, "Feedback not found", { code: FEEDBACK_ERROR_CODES.NOT_FOUND });
    }

    await prisma.feedback.delete({ where: { id: existing.id } });
    await updateCustomerSatisfaction(auth.salonId, existing.customerId);
  }
}

export const feedbackRepository = new FeedbackRepository();
