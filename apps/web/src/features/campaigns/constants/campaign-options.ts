import type { CampaignBuyingType, CampaignObjective, CampaignStatus, PlatformType } from "@/types/campaign";

export const CAMPAIGN_STATUS_OPTIONS: CampaignStatus[] = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED", "DELETED"];
export const CAMPAIGN_OBJECTIVE_OPTIONS: CampaignObjective[] = [
  "AWARENESS",
  "TRAFFIC",
  "ENGAGEMENT",
  "LEADS",
  "SALES",
  "APP_PROMOTION",
  "VIDEO",
  "LOCAL",
  "CATALOG_SALES",
  "STORE_VISITS",
  "MESSAGES",
];
export const CAMPAIGN_BUYING_TYPE_OPTIONS: CampaignBuyingType[] = [
  "AUCTION",
  "RESERVED",
  "FIXED",
  "PROGRAMMATIC",
];
export const PLATFORM_OPTIONS: PlatformType[] = [
  "META",
  "GOOGLE",
  "TIKTOK",
  "LINKEDIN",
  "SNAPCHAT",
  "PINTEREST",
  "MICROSOFT",
  "TWITTER",
  "REDDIT",
  "AMAZON",
  "SHOPIFY",
];
