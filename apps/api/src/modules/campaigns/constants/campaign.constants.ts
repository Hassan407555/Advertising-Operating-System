import { Prisma } from '@prisma/client';

export const CAMPAIGN_INCLUDE = Prisma.validator<Prisma.CampaignInclude>()({
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
  adAccount: {
    select: {
      id: true,
      accountName: true,
      platform: true,
      externalId: true,
      currency: true,
      timezone: true,
      isActive: true,
    },
  },
});

export type CampaignWithRelations =
  Prisma.CampaignGetPayload<{
    include: typeof CAMPAIGN_INCLUDE;
  }>;

export const DEFAULT_PAGE = 1;

export const DEFAULT_LIMIT = 20;

export const MAX_LIMIT = 100;

export const DEFAULT_SORT_BY = 'createdAt';

export const DEFAULT_SORT_ORDER = 'desc';

export const CAMPAIGN_SORT_FIELDS = [
  'name',
  'status',
  'objective',
  'createdAt',
  'updatedAt',
  'startDate',
  'endDate',
] as const;

export type CampaignSortField =
  (typeof CAMPAIGN_SORT_FIELDS)[number];