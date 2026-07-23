import { Prisma } from '@prisma/client';

export const AD_ACCOUNT_SORT_FIELDS = [
  'accountName',
  'externalId',
  'currency',
  'status',
  'createdAt',
  'updatedAt',
  'lastSyncedAt',
  'spend',
  'impressions',
  'clicks',
  'conversions',
  'version',
] as const;

export type AdAccountSortField =
  (typeof AD_ACCOUNT_SORT_FIELDS)[number];

export const AD_ACCOUNT_DEFAULT_PAGE = 1;

export const AD_ACCOUNT_DEFAULT_LIMIT = 20;

export const AD_ACCOUNT_MAX_LIMIT = 100;

export const AD_ACCOUNT_DEFAULT_SORT_BY: AdAccountSortField =
  'createdAt';

export const AD_ACCOUNT_DEFAULT_SORT_ORDER: Prisma.SortOrder =
  'desc';

export const AD_ACCOUNT_INCLUDE =
  Prisma.validator<Prisma.AdAccountInclude>()({
    organization: true,
    platformConnection: true,
  });

export type AdAccountWithRelations =
  Prisma.AdAccountGetPayload<{
    include: typeof AD_ACCOUNT_INCLUDE;
  }>;