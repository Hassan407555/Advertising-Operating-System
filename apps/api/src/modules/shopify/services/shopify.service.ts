import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AuditAction,
  AuditEntity,
  ConnectionStatus,
  PlatformType,
  SyncStatus,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../infrastructure/encryption/encryption.service';

import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';

import { ShopifyApiService } from './shopify-api.service';
import { ShopifyProductsService } from './shopify-products.service';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import {
  SHOPIFY_AUTHORIZE_ENDPOINT,
  SHOPIFY_SCOPES,
} from '../constants/shopify.constants';

@Injectable()
export class ShopifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly auditLogsService: AuditLogsService,
    private readonly shopifyApi: ShopifyApiService,
    private readonly shopifyProductsService: ShopifyProductsService,
  ) {}

  /**
   * Generates Shopify OAuth URL.
   */
  async connect(
    currentUser: JwtPayload,
    shop: string,
  ): Promise<{ authorizationUrl: string }> {
    if (!shop) {
      throw new BadRequestException(
        'Shop domain is required.',
      );
    }

    const state = Buffer.from(
      JSON.stringify({
        organizationId: currentUser.organizationId,
        userId: currentUser.sub,
        timestamp: Date.now(),
      }),
    ).toString('base64');

    const authorizationUrl =
  `${SHOPIFY_AUTHORIZE_ENDPOINT(shop)}` +
  `?client_id=${process.env.SHOPIFY_CLIENT_ID}` +
  `&scope=${SHOPIFY_SCOPES.join(',')}` +
  `&redirect_uri=${encodeURIComponent(
    process.env.SHOPIFY_REDIRECT_URI!,
  )}` +
  `&state=${encodeURIComponent(state)}` +
  `&response_type=code`;

    return {
      authorizationUrl,
    };
  }
    /**
   * Handles the Shopify OAuth callback.
   */
async callback(
  code: string,
  shop: string,
  state?: string,
): Promise<void> {
  if (!shop || !code || !state) {
    throw new BadRequestException(
      'Missing Shopify OAuth parameters.',
    );
  }

  let organizationId: string;
  let userId: string;

  try {
    const decodedState = JSON.parse(
      Buffer.from(state, 'base64').toString('utf8'),
    );

    organizationId = decodedState.organizationId;
    userId = decodedState.userId;

    if (!organizationId || !userId) {
      throw new Error();
    }
  } catch {
    throw new BadRequestException(
      'Invalid Shopify OAuth state.',
    );
  }

  const accessToken =
    await this.shopifyApi.exchangeAccessToken(
      shop,
      code,
    );

  const shopInfo =
    await this.shopifyApi.getShop(
      shop,
      accessToken,
    );

  const encryptedAccessToken =
    this.encryptionService.encrypt(
      accessToken,
    );

  const connection =
    await this.prisma.platformConnection.upsert({
      where: {
        organizationId_platform_accountId: {
          organizationId,
          platform: PlatformType.SHOPIFY,
          accountId: shopInfo.id,
        },
      },

      create: {
        organizationId,
        createdByUserId: userId,

        platform:
          PlatformType.SHOPIFY,

        accountId:
          shopInfo.id,

        accountName:
          shopInfo.name,

        externalName:
          shop,

        status:
          ConnectionStatus.ACTIVE,

        syncStatus:
          SyncStatus.SYNCED,

        metadata: {
          domain: shopInfo.domain,
          email: shopInfo.email,
        },
      },

      update: {
		        accountName:
          shopInfo.name,

        externalName:
          shop,

        status:
          ConnectionStatus.ACTIVE,

        deletedAt: null,

        metadata: {
          domain: shopInfo.domain,
          email: shopInfo.email,
        },

        version: {
          increment: 1,
        },
      },
    });

  const existingCredential =
    await this.prisma.platformCredential.findFirst({
      where: {
        platformConnectionId:
          connection.id,
      },
    });

  if (!existingCredential) {
    await this.prisma.platformCredential.create({
      data: {
        platformConnectionId:
          connection.id,

        accessToken:
          encryptedAccessToken,

        refreshToken: null,

        expiresAt: null,

        scopes:
          SHOPIFY_SCOPES,

        isActive: true,
      },
    });
  } else {
    await this.prisma.platformCredential.update({
      where: {
        id: existingCredential.id,
      },

      data: {
        accessToken:
          encryptedAccessToken,

        scopes:
          SHOPIFY_SCOPES,

        isActive: true,

        revokedAt: null,

        revokedReason: null,

        rotatedAt: new Date(),

        version: {
          increment: 1,
        },
      },
    });
  }

  await this.auditLogsService.log({
    organizationId,

    actorId:
      userId,

    action:
      AuditAction.PLATFORM_CONNECTED,

    entity:
      AuditEntity.PLATFORM,

    entityId:
      connection.id,
	    metadata: {
      platform:
        PlatformType.SHOPIFY,

      shop,

      accountName:
        connection.accountName,
    },
  });
}

    /**
   * Disconnects the connected Shopify store.
   */
  async disconnect(
    currentUser: JwtPayload,
  ): Promise<void> {
    const connection =
      await this.prisma.platformConnection.findFirst({
        where: {
          organizationId:
            currentUser.organizationId,

          platform:
            PlatformType.SHOPIFY,

          deletedAt: null,
        },
      });

    if (!connection) {
      throw new NotFoundException(
        'No Shopify connection found.',
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        await tx.platformCredential.updateMany({
          where: {
            platformConnectionId:
              connection.id,

            isActive: true,
          },

          data: {
            isActive: false,

            revokedAt: new Date(),

            revokedReason:
              'Disconnected by user',

            version: {
              increment: 1,
            },
          },
        });

        await tx.platformConnection.update({
          where: {
            id: connection.id,
          },

          data: {
            status:
              ConnectionStatus.INACTIVE,

            syncStatus:
              SyncStatus.SYNCED,

            deletedAt: new Date(),

            version: {
              increment: 1,
            },
          },
        });

        await this.auditLogsService.log(
          {
            organizationId:
              currentUser.organizationId,

            actorId:
              currentUser.sub,

            action:
              AuditAction.PLATFORM_DISCONNECTED,

            entity:
              AuditEntity.PLATFORM,

            entityId:
              connection.id,

            metadata: {
              platform:
                PlatformType.SHOPIFY,

              accountName:
                connection.accountName,
            },
          },
          tx,
        );
      },
    );
  }
    /**
   * Returns the connected Shopify store.
   */
  async getStore(
    currentUser: JwtPayload,
  ) {
    const connection =
      await this.prisma.platformConnection.findFirst({
        where: {
          organizationId:
            currentUser.organizationId,

          platform:
            PlatformType.SHOPIFY,

          deletedAt: null,
        },

        include: {
          credentials: {
            where: {
              isActive: true,
              revokedAt: null,
            },

            orderBy: {
              createdAt: 'desc',
            },

            take: 1,
          },
        },
      });

    if (!connection) {
      throw new NotFoundException(
        'No Shopify store connected.',
      );
    }

    return {
      id: connection.id,

      platform:
        connection.platform,

      accountId:
        connection.accountId,

      accountName:
        connection.accountName,

      shop:
        connection.externalName,

      status:
        connection.status,

      syncStatus:
        connection.syncStatus,

      connected: true,

      lastSyncedAt:
        connection.lastSyncedAt,

      lastSuccessfulSyncAt:
        connection.lastSuccessfulSyncAt,

      lastFailedSyncAt:
        connection.lastFailedSyncAt,

      createdAt:
        connection.createdAt,

      updatedAt:
        connection.updatedAt,
    };
  }
    /**
   * Starts a manual Shopify product synchronization.
   */
  async syncProducts(
    currentUser: JwtPayload,
  ) {
    const connection =
      await this.prisma.platformConnection.findFirst({
        where: {
          organizationId:
            currentUser.organizationId,

          platform:
            PlatformType.SHOPIFY,

          status:
            ConnectionStatus.ACTIVE,

          deletedAt: null,
        },
      });

    if (!connection) {
      throw new NotFoundException(
        'No active Shopify connection found.',
      );
    }

    const credential =
      await this.prisma.platformCredential.findFirst({
        where: {
          platformConnectionId:
            connection.id,

          isActive: true,

          revokedAt: null,
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    if (!credential) {
      throw new BadRequestException(
        'No active Shopify credentials found.',
      );
    }

    return this.shopifyProductsService.syncProducts(
      currentUser,
    );
  }
}