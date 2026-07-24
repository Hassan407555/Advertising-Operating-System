import { Prisma } from '@prisma/client';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const DEFAULT_SORT_BY = 'createdAt';
export const DEFAULT_SORT_ORDER: Prisma.SortOrder = 'desc';

export const CREATIVE_ASSET_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'displayOrder',
  'fileName',
  'assetType',
] as const;

export const CREATIVE_ASSET_INCLUDE =
  Prisma.validator<Prisma.CreativeAssetInclude>()({
    organization: {
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
      },
    },
    ad: {
      select: {
        id: true,
        name: true,
      },
    },
  });