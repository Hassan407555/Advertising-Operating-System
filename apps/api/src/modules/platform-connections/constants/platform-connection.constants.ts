import { Prisma } from '@prisma/client';

export const PLATFORM_CONNECTION_INCLUDE =
  Prisma.validator<Prisma.PlatformConnectionInclude>()({
    createdBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },

    adAccounts: {
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        accountName: true,
        platform: true,
        status: true,
        currency: true,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    },

    credentials: {
      select: {
        id: true,
        isActive: true,
        expiresAt: true,
        revokedAt: true,
        rotatedAt: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    },
  });

export type PlatformConnectionWithRelations =
  Prisma.PlatformConnectionGetPayload<{
    include: typeof PLATFORM_CONNECTION_INCLUDE;
  }>;