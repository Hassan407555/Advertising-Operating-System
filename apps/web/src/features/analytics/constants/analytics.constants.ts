import type { PlatformType } from "@/types/campaign";

export const ANALYTICS_PLATFORM_OPTIONS: PlatformType[] = [
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

export const ANALYTICS_LEVEL_OPTIONS = ["ACCOUNT", "CAMPAIGN", "AD_SET", "AD", "CREATIVE"] as const;
export const ANALYTICS_GROUP_BY_OPTIONS = ["hour", "day", "week", "month"] as const;
export const ANALYTICS_BREAKDOWN_DIMENSIONS = ["campaign", "adSet", "ad", "creative"] as const;
export const ANALYTICS_SORT_FIELDS = [
  "snapshotDate",
  "spend",
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "conversions",
  "revenue",
  "roas",
  "createdAt",
  "updatedAt",
] as const;
