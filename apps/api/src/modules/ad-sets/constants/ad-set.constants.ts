import { Prisma } from '@prisma/client';

export const AD_SET_INCLUDE = Prisma.validator<Prisma.AdSetInclude>()({
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
    },
  },
});

export type AdSetWithRelations = Prisma.AdSetGetPayload<{
  include: typeof AD_SET_INCLUDE;
}>;

export const AD_SET_DEFAULT_SORT = {
  createdAt: 'desc',
} as const;

export const AD_SET_MAX_PAGE_SIZE = 100;

export const AD_SET_DEFAULT_PAGE_SIZE = 20;

export const AD_SET_ALLOWED_SORT_FIELDS = [
  'name',
  'status',
  'createdAt',
  'updatedAt',
  'startDate',
  'endDate',
  'dailyBudget',
  'lifetimeBudget',
  'bidAmount',
] as const;

export type AdSetSortField =
  (typeof AD_SET_ALLOWED_SORT_FIELDS)[number];