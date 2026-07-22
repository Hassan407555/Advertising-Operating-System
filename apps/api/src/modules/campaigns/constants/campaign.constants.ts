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

export type CampaignWithRelations = Prisma.CampaignGetPayload<{
  include: typeof CAMPAIGN_INCLUDE;
}>;

export const CAMPAIGN_DEFAULT_SORT = {
  createdAt: 'desc',
} as const;

export const CAMPAIGN_MAX_PAGE_SIZE = 100;

export const CAMPAIGN_DEFAULT_PAGE_SIZE = 20;

export const CAMPAIGN_ALLOWED_SORT_FIELDS = [
  'name',
  'status',
  'objective',
  'createdAt',
  'updatedAt',
  'startDate',
  'endDate',
] as const;

export type CampaignSortField =
  (typeof CAMPAIGN_ALLOWED_SORT_FIELDS)[number];