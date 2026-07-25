import {
  AnalyticsLevel,
  Currency,
  PlatformType,
} from '@prisma/client';

export class AnalyticsResponseDto {
  id: string;

  organizationId: string;

  platform: PlatformType;

  level: AnalyticsLevel;

  campaignId?: string | null;

  adSetId?: string | null;

  adId?: string | null;

  creativeId?: string | null;

  snapshotDate: Date;

  currency: Currency;

  impressions: number;

  reach: number;

  clicks: number;

  linkClicks: number;

  spend: number;

  cpc?: number | null;

  cpm?: number | null;

  ctr?: number | null;

  conversions?: number | null;

  conversionValue?: number | null;

  revenue?: number | null;

  roas?: number | null;

  videoViews: number;

  platformMetrics?: Record<string, unknown> | null;

  lastSyncedAt?: Date | null;

  createdAt: Date;

  updatedAt: Date;

  campaignName?: string | null;

  adSetName?: string | null;

  adName?: string | null;

  creativeName?: string | null;
}