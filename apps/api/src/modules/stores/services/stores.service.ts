import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AiSessionStatus,
  ConnectionStatus,
  PlatformType,
  Prisma,
  ShopifyProductStatus,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ACTIVE_AI_SESSION_STATUSES } from '../../ai-sessions/constants/ai-session.constants';
import {
  ListStoreProductsQueryDto,
  StoreAdvertisingConfigurationResponseDto,
  StoreProductResponseDto,
  StoreProductsListResponseDto,
  StoreSummaryResponseDto,
  UpsertStoreAdvertisingConfigurationDto,
} from '../dto/store.dto';
import {
  computeStoreHealth,
  getAdvertisingBlockingReasons,
  isAdvertisingReady,
  type StoreCapabilityInput,
} from '../utils/store-readiness.util';

function emptyToNull(value?: string | null): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async listStores(currentUser: JwtPayload): Promise<StoreSummaryResponseDto[]> {
    const connections = await this.prisma.platformConnection.findMany({
      where: {
        organizationId: currentUser.organizationId,
        platform: PlatformType.SHOPIFY,
        deletedAt: null,
        status: ConnectionStatus.ACTIVE,
      },
      orderBy: { accountName: 'asc' },
      include: {
        shopifyAdvertisingConfiguration: true,
      },
    });

    if (connections.length === 0) {
      return [];
    }

    const storeIds = connections.map((connection) => connection.id);
    const metaConnectionIds = [
      ...new Set(
        connections
          .map(
            (connection) =>
              connection.shopifyAdvertisingConfiguration?.metaPlatformConnectionId,
          )
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [productCounts, activeMetaConnections] = await Promise.all([
      this.prisma.shopifyProduct.groupBy({
        by: ['platformConnectionId'],
        where: {
          organizationId: currentUser.organizationId,
          platformConnectionId: { in: storeIds },
          deletedAt: null,
        },
        _count: { _all: true },
      }),
      metaConnectionIds.length > 0
        ? this.prisma.platformConnection.findMany({
            where: {
              id: { in: metaConnectionIds },
              organizationId: currentUser.organizationId,
              platform: PlatformType.META,
              deletedAt: null,
              status: ConnectionStatus.ACTIVE,
            },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const productCountByStoreId = new Map(
      productCounts.map((row) => [row.platformConnectionId, row._count._all]),
    );
    const activeMetaIds = new Set(
      activeMetaConnections.map((connection) => connection.id),
    );

    return connections.map((connection) =>
      this.toStoreSummaryFromCaches(
        connection,
        productCountByStoreId.get(connection.id) ?? 0,
        activeMetaIds,
      ),
    );
  }

  async getStore(
    storeId: string,
    currentUser: JwtPayload,
  ): Promise<StoreSummaryResponseDto> {
    const connection = await this.requireShopifyStore(storeId, currentUser);
    return this.toStoreSummary(connection);
  }

  async getAdvertisingConfiguration(
    storeId: string,
    currentUser: JwtPayload,
  ): Promise<StoreAdvertisingConfigurationResponseDto | null> {
    await this.requireShopifyStore(storeId, currentUser);

    const config = await this.prisma.storeAdvertisingConfiguration.findUnique({
      where: { shopifyStoreId: storeId },
    });

    return config ? this.toConfigurationDto(config) : null;
  }

  async upsertAdvertisingConfiguration(
    storeId: string,
    dto: UpsertStoreAdvertisingConfigurationDto,
    currentUser: JwtPayload,
  ): Promise<StoreAdvertisingConfigurationResponseDto> {
    await this.requireShopifyStore(storeId, currentUser);

    const metaPlatformConnectionId = emptyToNull(dto.metaPlatformConnectionId);
    const metaBusinessId = emptyToNull(dto.metaBusinessId);
    const adAccountId = emptyToNull(dto.adAccountId);
    const facebookPageId = emptyToNull(dto.facebookPageId);
    const instagramAccountId = emptyToNull(dto.instagramAccountId);
    const pixelId = emptyToNull(dto.pixelId);
    const catalogId = emptyToNull(dto.catalogId);

    if (metaPlatformConnectionId) {
      const metaConnection = await this.prisma.platformConnection.findFirst({
        where: {
          id: metaPlatformConnectionId,
          organizationId: currentUser.organizationId,
          platform: PlatformType.META,
          deletedAt: null,
        },
      });
      if (!metaConnection) {
        throw new BadRequestException('Meta connection was not found for this organization.');
      }
    }

    if (adAccountId) {
      const adAccount = await this.prisma.adAccount.findFirst({
        where: {
          id: adAccountId,
          organizationId: currentUser.organizationId,
          platform: PlatformType.META,
          deletedAt: null,
        },
      });
      if (!adAccount) {
        throw new BadRequestException('Ad account was not found for this organization.');
      }
    }

    const config = await this.prisma.storeAdvertisingConfiguration.upsert({
      where: { shopifyStoreId: storeId },
      create: {
        organizationId: currentUser.organizationId,
        shopifyStoreId: storeId,
        metaPlatformConnectionId: metaPlatformConnectionId ?? null,
        metaBusinessId: metaBusinessId ?? null,
        adAccountId: adAccountId ?? null,
        facebookPageId: facebookPageId ?? null,
        instagramAccountId: instagramAccountId ?? null,
        pixelId: pixelId ?? null,
        catalogId: catalogId ?? null,
      },
      update: {
        ...(metaPlatformConnectionId !== undefined
          ? { metaPlatformConnectionId }
          : {}),
        ...(metaBusinessId !== undefined ? { metaBusinessId } : {}),
        ...(adAccountId !== undefined ? { adAccountId } : {}),
        ...(facebookPageId !== undefined ? { facebookPageId } : {}),
        ...(instagramAccountId !== undefined ? { instagramAccountId } : {}),
        ...(pixelId !== undefined ? { pixelId } : {}),
        ...(catalogId !== undefined ? { catalogId } : {}),
      },
    });

    return this.toConfigurationDto(config);
  }

  async listProducts(
    storeId: string,
    query: ListStoreProductsQueryDto,
    currentUser: JwtPayload,
  ): Promise<StoreProductsListResponseDto> {
    const store = await this.getStore(storeId, currentUser);
    const blockingReasons = getAdvertisingBlockingReasons({
      shopifyConnected: store.capabilities.shopifyConnected,
      metaConnected: store.capabilities.metaConnected,
      productsSynced: store.capabilities.productsSynced,
      productCount: store.capabilities.productCount,
      lastSyncAt: store.capabilities.lastSyncAt,
      adAccountSelected: store.capabilities.adAccountSelected,
      facebookPageSelected: store.capabilities.facebookPageSelected,
      instagramSelected: store.capabilities.instagramSelected,
      pixelSelected: store.capabilities.pixelSelected,
      catalogSelected: store.capabilities.catalogSelected,
    });

    const advertisingEligibility = {
      eligible: store.advertisingReady,
      reasons: blockingReasons,
    };

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    const where: Prisma.ShopifyProductWhereInput = {
      organizationId: currentUser.organizationId,
      platformConnectionId: storeId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { handle: { contains: search, mode: 'insensitive' } },
              { vendor: { contains: search, mode: 'insensitive' } },
              { productType: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.shopifyProduct.count({ where }),
      this.prisma.shopifyProduct.findMany({
        where,
        orderBy: { title: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const productIds = products.map((product) => product.id);
    const activeSessions =
      productIds.length === 0
        ? []
        : await this.prisma.aiSession.findMany({
            where: {
              organizationId: currentUser.organizationId,
              shopifyStoreId: storeId,
              productId: { in: productIds },
              status: {
                in: [...ACTIVE_AI_SESSION_STATUSES] as AiSessionStatus[],
              },
            },
            select: { id: true, productId: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          });

    const activeSessionByProduct = new Map<string, string>();
    for (const session of activeSessions) {
      if (!activeSessionByProduct.has(session.productId)) {
        activeSessionByProduct.set(session.productId, session.id);
      }
    }

    const data: StoreProductResponseDto[] = products.map((product) => ({
      id: product.id,
      externalId: product.externalId,
      title: product.title,
      handle: product.handle,
      vendor: product.vendor,
      productType: product.productType,
      description: product.description,
      status: product.status,
      tags: product.tags,
      featuredImageUrl: product.featuredImageUrl,
      lastSyncedAt: product.lastSyncedAt,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      canAdvertise:
        advertisingEligibility.eligible &&
        product.status === ShopifyProductStatus.ACTIVE,
      activeSessionId: activeSessionByProduct.get(product.id) ?? null,
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      advertisingEligibility,
    };
  }

  private async requireShopifyStore(storeId: string, currentUser: JwtPayload) {
    const connection = await this.prisma.platformConnection.findFirst({
      where: {
        id: storeId,
        organizationId: currentUser.organizationId,
        platform: PlatformType.SHOPIFY,
        deletedAt: null,
      },
      include: {
        shopifyAdvertisingConfiguration: true,
      },
    });

    if (!connection) {
      throw new NotFoundException('Store was not found.');
    }

    return connection;
  }

  private async toStoreSummary(connection: {
    id: string;
    organizationId: string;
    accountId: string;
    accountName: string;
    status: ConnectionStatus;
    syncStatus: string;
    lastSyncedAt: Date | null;
    lastSuccessfulSyncAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    shopifyAdvertisingConfiguration: {
      metaPlatformConnectionId: string | null;
      metaBusinessId: string | null;
      adAccountId: string | null;
      facebookPageId: string | null;
      instagramAccountId: string | null;
      pixelId: string | null;
      catalogId: string | null;
    } | null;
  }): Promise<StoreSummaryResponseDto> {
    const productCount = await this.prisma.shopifyProduct.count({
      where: {
        platformConnectionId: connection.id,
        organizationId: connection.organizationId,
        deletedAt: null,
      },
    });

    const activeMetaIds = new Set<string>();
    const metaPlatformConnectionId =
      connection.shopifyAdvertisingConfiguration?.metaPlatformConnectionId;
    if (metaPlatformConnectionId) {
      const metaConnection = await this.prisma.platformConnection.findFirst({
        where: {
          id: metaPlatformConnectionId,
          organizationId: connection.organizationId,
          platform: PlatformType.META,
          deletedAt: null,
          status: ConnectionStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (metaConnection) {
        activeMetaIds.add(metaConnection.id);
      }
    }

    return this.toStoreSummaryFromCaches(
      connection,
      productCount,
      activeMetaIds,
    );
  }

  private toStoreSummaryFromCaches(
    connection: {
      id: string;
      organizationId: string;
      accountId: string;
      accountName: string;
      status: ConnectionStatus;
      syncStatus: string;
      lastSyncedAt: Date | null;
      lastSuccessfulSyncAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      shopifyAdvertisingConfiguration: {
        metaPlatformConnectionId: string | null;
        metaBusinessId: string | null;
        adAccountId: string | null;
        facebookPageId: string | null;
        instagramAccountId: string | null;
        pixelId: string | null;
        catalogId: string | null;
      } | null;
    },
    productCount: number,
    activeMetaIds: Set<string>,
  ): StoreSummaryResponseDto {
    const config = connection.shopifyAdvertisingConfiguration;
    let metaConnected = Boolean(
      config?.metaPlatformConnectionId || config?.metaBusinessId,
    );

    if (config?.metaPlatformConnectionId) {
      metaConnected = activeMetaIds.has(config.metaPlatformConnectionId);
    }

    const capabilities: StoreCapabilityInput = {
      shopifyConnected: connection.status === ConnectionStatus.ACTIVE,
      metaConnected,
      productsSynced: productCount > 0 || Boolean(connection.lastSuccessfulSyncAt),
      productCount,
      lastSyncAt:
        connection.lastSuccessfulSyncAt?.toISOString() ??
        connection.lastSyncedAt?.toISOString() ??
        null,
      adAccountSelected: Boolean(config?.adAccountId),
      facebookPageSelected: Boolean(config?.facebookPageId),
      instagramSelected: Boolean(config?.instagramAccountId),
      pixelSelected: Boolean(config?.pixelId),
      catalogSelected: Boolean(config?.catalogId),
    };

    return {
      id: connection.id,
      organizationId: connection.organizationId,
      name: connection.accountName || connection.accountId,
      shopDomain: connection.accountId,
      status: connection.status,
      syncStatus: connection.syncStatus,
      lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
      lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt?.toISOString() ?? null,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
      capabilities: {
        shopifyConnected: capabilities.shopifyConnected,
        metaConnected: capabilities.metaConnected,
        productsSynced: capabilities.productsSynced,
        productCount: capabilities.productCount,
        lastSyncAt: capabilities.lastSyncAt,
        adAccountSelected: capabilities.adAccountSelected,
        facebookPageSelected: capabilities.facebookPageSelected,
        instagramSelected: capabilities.instagramSelected,
        pixelSelected: capabilities.pixelSelected,
        catalogSelected: capabilities.catalogSelected,
      },
      advertisingReady: isAdvertisingReady(capabilities),
      health: computeStoreHealth(capabilities),
    };
  }

  private toConfigurationDto(config: {
    id: string;
    organizationId: string;
    shopifyStoreId: string;
    metaPlatformConnectionId: string | null;
    metaBusinessId: string | null;
    adAccountId: string | null;
    facebookPageId: string | null;
    instagramAccountId: string | null;
    pixelId: string | null;
    catalogId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): StoreAdvertisingConfigurationResponseDto {
    return {
      id: config.id,
      organizationId: config.organizationId,
      shopifyStoreId: config.shopifyStoreId,
      metaPlatformConnectionId: config.metaPlatformConnectionId,
      metaBusinessId: config.metaBusinessId,
      adAccountId: config.adAccountId,
      facebookPageId: config.facebookPageId,
      instagramAccountId: config.instagramAccountId,
      pixelId: config.pixelId,
      catalogId: config.catalogId,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
