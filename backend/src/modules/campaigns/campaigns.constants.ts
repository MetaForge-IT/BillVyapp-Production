export const CAMPAIGN_OFFER_TYPE = {
  PERCENTAGE: "percentage",
  FLAT: "flat",
} as const;

export type CampaignOfferType = (typeof CAMPAIGN_OFFER_TYPE)[keyof typeof CAMPAIGN_OFFER_TYPE];

export const CAMPAIGN_SCOPE = {
  ALL_SERVICES: "all_services",
  SELECTED_SERVICES: "selected_services",
} as const;

export type CampaignScope = (typeof CAMPAIGN_SCOPE)[keyof typeof CAMPAIGN_SCOPE];

export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  SENDING: "sending",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUS)[keyof typeof CAMPAIGN_STATUS];

export const CAMPAIGN_SEND_STATUS = {
  QUEUED: "queued",
  SENT: "sent",
  FAILED: "failed",
} as const;

export const CAMPAIGN_ERROR_CODES = {
  NOT_FOUND: "CAMPAIGN_NOT_FOUND",
  NOT_DRAFT: "CAMPAIGN_NOT_DRAFT",
  ALREADY_SENT: "CAMPAIGN_ALREADY_SENT",
  NO_AUDIENCE: "CAMPAIGN_NO_AUDIENCE",
  INVALID_SERVICES: "CAMPAIGN_INVALID_SERVICES",
} as const;
