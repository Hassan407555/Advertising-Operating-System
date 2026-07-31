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
  StoreProductDetailResponseDto,
  StoreProductResponseDto,
  StoreProductsListResponseDto,
  StoreSummaryResponseDto,
  UpsertStoreAdvertisingConfigurationDto,
} from '../dto/store.dto';
import {
  computeStoreHealth,
  getGenerationBlockingReasons,
  getMetaPublishBlockingReasons,
  isAdvertisingReady,
  isGenerationReady,
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

  async listStores(
    currentUser: JwtPayload,
  ): Promise<StoreSummaryResponseDto[]> {
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
              connection.shopifyAdvertisingConfiguration
                ?.metaPlatformConnectionId,
          )
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [productCounts, activeMetaConnections, orgMetaConnections] =
      await Promise.all([
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
          : Promise.resolve([] as Array<{ id: string }>),
        this.prisma.platformConnection.findMany({
          where: {
            organizationId: currentUser.organizationId,
            platform: PlatformType.META,
            deletedAt: null,
            status: ConnectionStatus.ACTIVE,
          },
          select: { id: true },
          take: 1,
        }),
      ]);

    const productCountByStoreId = new Map(
      productCounts.map((row) => [row.platformConnectionId, row._count._all]),
    );
    const activeMetaIds = new Set<string>(
      activeMetaConnections.map((connection) => connection.id),
    );
    const hasOrgMetaConnection = orgMetaConnections.length > 0;

    return connections.map((connection) =>
      this.toStoreSummaryFromCaches(
        connection,
        productCountByStoreId.get(connection.id) ?? 0,
        activeMetaIds,
        hasOrgMetaConnection,
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
        throw new BadRequestException(
          'Meta connection was not found for this organization.',
        );
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
        throw new BadRequestException(
          'Ad account was not found for this organization.',
        );
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
    const capabilityInput = this.toCapabilityInput(store.capabilities);
    const blockingReasons = getGenerationBlockingReasons(capabilityInput);

    const advertisingEligibility = {
      eligible: isGenerationReady(capabilityInput),
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

    const data: StoreProductResponseDto[] = products.map((product) =>
      this.toProductListItem(
        product,
        advertisingEligibility.eligible,
        activeSessionByProduct.get(product.id) ?? null,
      ),
    );

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

  async getProduct(
    storeId: string,
    productId: string,
    currentUser: JwtPayload,
  ): Promise<StoreProductDetailResponseDto> {
    const store = await this.getStore(storeId, currentUser);
    const generationEligible = isGenerationReady(
      this.toCapabilityInput(store.capabilities),
    );

    const product = await this.prisma.shopifyProduct.findFirst({
      where: {
        id: productId,
        organizationId: currentUser.organizationId,
        platformConnectionId: storeId,
        deletedAt: null,
      },
      include: {
        variants: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
        images: { orderBy: { displayOrder: 'asc' } },
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Product was not found for this store and organization.',
      );
    }

    const activeSession = await this.prisma.aiSession.findFirst({
      where: {
        organizationId: currentUser.organizationId,
        shopifyStoreId: storeId,
        productId: product.id,
        status: {
          in: [...ACTIVE_AI_SESSION_STATUSES] as AiSessionStatus[],
        },
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    const primaryVariant =
      product.variants.find((variant) => variant.isDefault) ??
      product.variants[0] ??
      null;

    const inventoryValues = product.variants
      .map((variant) => variant.inventoryQuantity)
      .filter(
        (value): value is number => value !== null && value !== undefined,
      );
    const inventory =
      inventoryValues.length > 0
        ? inventoryValues.reduce((sum, value) => sum + value, 0)
        : null;

    return {
      ...this.toProductListItem(
        product,
        generationEligible,
        activeSession?.id ?? null,
      ),
      price: primaryVariant?.price?.toString() ?? null,
      compareAtPrice: primaryVariant?.compareAtPrice?.toString() ?? null,
      inventory,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        externalId: variant.externalId,
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        price: variant.price?.toString() ?? null,
        compareAtPrice: variant.compareAtPrice?.toString() ?? null,
        inventoryQuantity: variant.inventoryQuantity,
        option1: variant.option1,
        option2: variant.option2,
        option3: variant.option3,
        isDefault: variant.isDefault,
      })),
      images: product.images.map((image) => ({
        id: image.id,
        url: image.url,
        alt: image.alt,
        width: image.width,
        height: image.height,
        displayOrder: image.displayOrder,
      })),
      collections: this.extractCollections(product.metadata),
    };
  }

  private toProductListItem(
    product: {
      id: string;
      externalId: string;
      title: string;
      handle: string;
      vendor: string | null;
      productType: string | null;
      description: string | null;
      status: ShopifyProductStatus | string;
      tags: string[];
      featuredImageUrl: string | null;
      lastSyncedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    advertisingEligible: boolean,
    activeSessionId: string | null,
  ): StoreProductResponseDto {
    return {
      id: product.id,
      externalId: product.externalId,
      title: product.title,
      handle: product.handle,
      vendor: product.vendor,
      brand: product.vendor,
      productType: product.productType,
      description: product.description,
      status: product.status,
      tags: product.tags,
      featuredImageUrl: product.featuredImageUrl,
      lastSyncedAt: product.lastSyncedAt,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      canAdvertise:
        advertisingEligible && product.status === ShopifyProductStatus.ACTIVE,
      activeSessionId,
    };
  }

  /**
   * Throws when the store cannot publish drafts into Meta Ads Manager.
   * Used only by the Publish to Meta pipeline — never by AI generation.
   */
  async assertMetaPublishReady(
    storeId: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    const store = await this.getStore(storeId, currentUser);
    const reasons = getMetaPublishBlockingReasons(
      this.toCapabilityInput(store.capabilities),
    );
    if (reasons.length > 0) {
      throw new BadRequestException(
        `Complete Advertising Configuration before publishing to Meta. ${reasons.join('; ')}.`,
      );
    }
  }

  private toCapabilityInput(
    capabilities:
      StoreCapabilityInput | StoreSummaryResponseDto['capabilities'],
  ): StoreCapabilityInput {
    return {
      shopifyConnected: capabilities.shopifyConnected,
      metaConnected: capabilities.metaConnected,
      productsSynced: capabilities.productsSynced,
      productCount: capabilities.productCount,
      lastSyncAt: capabilities.lastSyncAt,
      adAccountSelected: capabilities.adAccountSelected,
      businessManagerSelected:
        'businessManagerSelected' in capabilities
          ? Boolean(capabilities.businessManagerSelected)
          : false,
      facebookPageSelected: capabilities.facebookPageSelected,
      instagramSelected: capabilities.instagramSelected,
      pixelSelected: capabilities.pixelSelected,
      catalogSelected: capabilities.catalogSelected,
    };
  }

  private extractCollections(metadata: Prisma.JsonValue | null): string[] {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return [];
    }

    const record = metadata as Record<string, unknown>;
    const raw =
      record.collections ?? record.collectionTitles ?? record.collection_titles;

    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        if (item && typeof item === 'object' && 'title' in item) {
          const title = (item as { title?: unknown }).title;
          return typeof title === 'string' ? title.trim() : '';
        }
        return '';
      })
      .filter(Boolean);
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

    const orgMetaConnection = await this.prisma.platformConnection.findFirst({
      where: {
        organizationId: connection.organizationId,
        platform: PlatformType.META,
        deletedAt: null,
        status: ConnectionStatus.ACTIVE,
      },
      select: { id: true },
    });

    return this.toStoreSummaryFromCaches(
      connection,
      productCount,
      activeMetaIds,
      Boolean(orgMetaConnection),
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
    hasOrgMetaConnection = false,
  ): StoreSummaryResponseDto {
    const config = connection.shopifyAdvertisingConfiguration;

    let metaConnected = hasOrgMetaConnection;

    if (!metaConnected && config?.metaPlatformConnectionId) {
      metaConnected = activeMetaIds.has(config.metaPlatformConnectionId);
    }

    if (!metaConnected && config?.metaBusinessId) {
      metaConnected = true;
    }

    const capabilities: StoreCapabilityInput = {
      shopifyConnected: connection.status === ConnectionStatus.ACTIVE,
      metaConnected,
      productsSynced:
        productCount > 0 || Boolean(connection.lastSuccessfulSyncAt),
      productCount,
      lastSyncAt:
        connection.lastSuccessfulSyncAt?.toISOString() ??
        connection.lastSyncedAt?.toISOString() ??
        null,
      adAccountSelected: Boolean(config?.adAccountId),
      businessManagerSelected: Boolean(config?.metaBusinessId),
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
      lastSuccessfulSyncAt:
        connection.lastSuccessfulSyncAt?.toISOString() ?? null,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
      capabilities: {
        shopifyConnected: capabilities.shopifyConnected,
        metaConnected: capabilities.metaConnected,
        productsSynced: capabilities.productsSynced,
        productCount: capabilities.productCount,
        lastSyncAt: capabilities.lastSyncAt,
        adAccountSelected: capabilities.adAccountSelected,
        businessManagerSelected: Boolean(capabilities.businessManagerSelected),
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
