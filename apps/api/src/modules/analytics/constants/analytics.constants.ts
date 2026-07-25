import { Prisma } from '@prisma/client';

export const ANALYTICS_INCLUDE =
  Prisma.validator<Prisma.AnalyticsSnapshotInclude>()({
    organization: {
      select: {
        id: true,
        name: true,
      },
    },

    campaign: {
      select: {
        id: true,
        name: true,
        status: true,
        objective: true,
      },
    },

    adSet: {
      select: {
        id: true,
        name: true,
        status: true,
      },
    },

    ad: {
      select: {
        id: true,
        name: true,
        status: true,
      },
    },

    creative: {
      select: {
        id: true,
        name: true,
      },
    },
  });

export type AnalyticsSnapshotWithRelations =
  Prisma.AnalyticsSnapshotGetPayload<{
    include: typeof ANALYTICS_INCLUDE;
  }>;

export const DEFAULT_PAGE = 1;

export const DEFAULT_LIMIT = 20;

export const MAX_LIMIT = 100;

export const DEFAULT_SORT_BY = 'snapshotDate';

export const DEFAULT_SORT_ORDER = 'desc';

export const DEFAULT_DATE_RANGE_DAYS = 30;

export const MAX_DATE_RANGE_DAYS = 365;

export const ANALYTICS_SORT_FIELDS = [
  'snapshotDate',
  'spend',
  'impressions',
  'clicks',
  'ctr',
  'cpc',
  'cpm',
  'conversions',
  'revenue',
  'roas',
  'createdAt',
  'updatedAt',
] as const;

export type AnalyticsSortField =
  (typeof ANALYTICS_SORT_FIELDS)[number];

export const ANALYTICS_METRICS = [
  'impressions',
  'reach',
  'clicks',
  'linkClicks',
  'spend',
  'cpc',
  'cpm',
  'ctr',
  'conversions',
  'conversionValue',
  'revenue',
  'roas',
  'videoViews',
] as const;

export type AnalyticsMetric =
  (typeof ANALYTICS_METRICS)[number];

export const TOP_PERFORMER_ENTITIES = [
  'campaign',
  'adSet',
  'ad',
  'creative',
] as const;

export type TopPerformerEntity =
  (typeof TOP_PERFORMER_ENTITIES)[number];

export const TOP_PERFORMER_METRICS = [
  'spend',
  'revenue',
  'roas',
  'ctr',
  'clicks',
  'impressions',
  'conversions',
] as const;

export type TopPerformerMetric =
  (typeof TOP_PERFORMER_METRICS)[number];