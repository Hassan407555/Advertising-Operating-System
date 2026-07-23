import { Prisma } from '@prisma/client';

export const AD_INCLUDE = Prisma.validator<Prisma.AdInclude>()({
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
  adSet: {
    select: {
      id: true,
      name: true,
    },
  },
  creative: {
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
    },
  },
});

export type AdWithRelations =
  Prisma.AdGetPayload<{
    include: typeof AD_INCLUDE;
  }>;

export const AD_DEFAULT_SORT = {
  createdAt: 'desc',
} as const;

export const AD_MAX_PAGE_SIZE = 100;

export const AD_DEFAULT_PAGE_SIZE = 20;

export const AD_ALLOWED_SORT_FIELDS = [
  'name',
  'status',
  'createdAt',
  'updatedAt',
  'isActive',
] as const;

export type AdSortField =
  (typeof AD_ALLOWED_SORT_FIELDS)[number];