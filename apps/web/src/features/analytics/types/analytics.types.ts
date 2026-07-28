import type { PaginatedResponse } from "@/types/api";
import type { PlatformType } from "@/types/campaign";
import type {
  ANALYTICS_BREAKDOWN_DIMENSIONS,
  ANALYTICS_GROUP_BY_OPTIONS,
  ANALYTICS_LEVEL_OPTIONS,
  ANALYTICS_SORT_FIELDS,
} from "@/features/analytics/constants/analytics.constants";

export type AnalyticsLevel = (typeof ANALYTICS_LEVEL_OPTIONS)[number];
export type AnalyticsGroupBy = (typeof ANALYTICS_GROUP_BY_OPTIONS)[number];
export type AnalyticsBreakdownDimension = (typeof ANALYTICS_BREAKDOWN_DIMENSIONS)[number];
export type AnalyticsSortField = (typeof ANALYTICS_SORT_FIELDS)[number];

export interface AnalyticsQuery {
  page: number;
  limit: number;
  platform?: PlatformType;
  level?: AnalyticsLevel;
  search?: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  creativeId?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: AnalyticsGroupBy;
  sortBy?: AnalyticsSortField;
  sortOrder?: "asc" | "desc";
}

export interface AnalyticsSnapshot {
  id: string;
  organizationId: string;
  platform: PlatformType;
  level: AnalyticsLevel;
  campaignId?: string | null;
  adSetId?: string | null;
  adId?: string | null;
  creativeId?: string | null;
  snapshotDate: string;
  currency: string;
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
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  campaignName?: string | null;
  adSetName?: string | null;
  adName?: string | null;
  creativeName?: string | null;
}

export interface AnalyticsSummary {
  totalSnapshots: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  revenue: number;
  videoViews: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  roas: number | null;
}

export interface AnalyticsTimeSeriesPoint {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  revenue: number;
  conversions: number;
}

export interface AnalyticsBreakdownRow {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  spend: number;
  revenue: number;
  conversions: number;
  count: number;
  ctr: number;
  roas: number;
}

export interface AnalyticsDashboardResponse {
  summary: AnalyticsSummary;
  timeSeries: AnalyticsTimeSeriesPoint[];
  breakdown: {
    campaigns: AnalyticsBreakdownRow[];
  };
}

export interface AnalyticsBreakdownQuery extends AnalyticsQuery {
  dimension: AnalyticsBreakdownDimension;
}

export type AnalyticsSnapshotsResponse = PaginatedResponse<AnalyticsSnapshot>;
