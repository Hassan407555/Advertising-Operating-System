import { Prisma } from '@prisma/client';

export const CREATIVE_SORT_FIELDS = [
  'name',
  'type',
  'createdAt',
  'updatedAt',
  'externalName',
  'headline',
] as const;

export type CreativeSortField =
  (typeof CREATIVE_SORT_FIELDS)[number];

export const CREATIVE_DEFAULT_PAGE = 1;

export const CREATIVE_DEFAULT_LIMIT = 10;

export const CREATIVE_MAX_LIMIT = 100;

export const CREATIVE_DEFAULT_SORT_BY: CreativeSortField =
  'createdAt';

export const CREATIVE_DEFAULT_SORT_ORDER: Prisma.SortOrder =
  'desc';

export const CREATIVE_INCLUDE =
  Prisma.validator<Prisma.CreativeInclude>()({
    organization: true,
    assets: {
      where: {
        isPrimary: true,
      },
      orderBy: {
        order: 'asc',
      },
    },
  });

export type CreativeWithRelations =
  Prisma.CreativeGetPayload<{
    include: typeof CREATIVE_INCLUDE;
  }>;