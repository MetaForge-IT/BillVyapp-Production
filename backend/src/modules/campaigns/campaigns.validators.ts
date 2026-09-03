import { z } from "zod";
import {
  CAMPAIGN_OFFER_TYPE,
  CAMPAIGN_SCOPE,
} from "./campaigns.constants";

export const createCampaignSchema = z
  .object({
    salonId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    offerType: z.enum([CAMPAIGN_OFFER_TYPE.PERCENTAGE, CAMPAIGN_OFFER_TYPE.FLAT]),
    offerValue: z.number().min(0),
    applicableScope: z
      .enum([CAMPAIGN_SCOPE.ALL_SERVICES, CAMPAIGN_SCOPE.SELECTED_SERVICES])
      .default(CAMPAIGN_SCOPE.ALL_SERVICES),
    serviceIds: z.array(z.string().uuid()).optional().default([]),
    validFrom: z.string().date(),
    validTill: z.string().date(),
    generateCoupon: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.validFrom > data.validTill) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "validTill must be on or after validFrom",
        path: ["validTill"],
      });
    }
    if (
      data.applicableScope === CAMPAIGN_SCOPE.SELECTED_SERVICES &&
      (!data.serviceIds || data.serviceIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one service",
        path: ["serviceIds"],
      });
    }
    if (
      data.offerType === CAMPAIGN_OFFER_TYPE.PERCENTAGE &&
      data.offerValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage offer cannot exceed 100",
        path: ["offerValue"],
      });
    }
  });

export const listCampaignsQuerySchema = z.object({
  salonId: z.string().uuid().optional(),
  status: z.string().trim().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
