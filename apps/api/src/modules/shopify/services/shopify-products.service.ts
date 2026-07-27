import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import {
  AuditAction,
  AuditEntity,
  ConnectionStatus,
  PlatformType,
  Prisma,
  ShopifyProductStatus,
  SyncStatus,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../infrastructure/encryption/encryption.service';
import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';

import { ShopifyApiService } from './shopify-api.service';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import type {
  ShopifyGraphQLProduct,
} from '../interfaces/shopify-product.interface';

import type {
  ShopifySyncResult,
} from '../interfaces/shopify-sync-result.interface';

@Injectable()
export class ShopifyProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly auditLogsService: AuditLogsService,
    private readonly shopifyApi: ShopifyApiService,
  ) {}

  async syncProducts(
    currentUser: JwtPayload,
  ): Promise<ShopifySyncResult> {
    const startedAt = Date.now();

    const connection =
      await this.prisma.platformConnection.findFirst({
        where: {
          organizationId: currentUser.organizationId,
          platform: PlatformType.SHOPIFY,
          deletedAt: null,
          status: ConnectionStatus.ACTIVE,
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
          platformConnectionId: connection.id,
          isActive: true,
          revokedAt: null,
        },
      });

    if (!credential) {
      throw new BadRequestException(
        'Shopify credentials not found.',
      );
    }

    const accessToken =
      this.encryptionService.decrypt(
        credential.accessToken,
      );

    await this.prisma.platformConnection.update({
      where: {
        id: connection.id,
      },
      data: {
        syncStatus: SyncStatus.SYNCING,
      },
    });

    try {
      const products =
        await this.fetchAllProducts(
          connection.externalName!,
          accessToken,
        );

      const summary =
        await this.persistProducts(
          connection,
          products,
        );

      await this.prisma.platformConnection.update({
        where: {
          id: connection.id,
        },
        data: {
          syncStatus: SyncStatus.SYNCED,
          lastSyncedAt: new Date(),
          lastSuccessfulSyncAt: new Date(),
        },
      });

      await this.auditLogsService.log({
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        action: AuditAction.PLATFORM_CONNECTED,
        entity: AuditEntity.PLATFORM,
        entityId: connection.id,
        metadata: {
          syncedProducts: summary.products,
          syncedVariants: summary.variants,
          syncedImages: summary.images,
        },
      });

      return {
        ...summary,
        duration: Date.now() - startedAt,
      };
    } catch (error) {
      await this.prisma.platformConnection.update({
        where: {
          id: connection.id,
        },
        data: {
          syncStatus: SyncStatus.FAILED,
          lastFailedSyncAt: new Date(),
        },
      });

      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'Shopify synchronization failed.',
      );
    }
  }

    /**
   * Fetches every product from Shopify using cursor-based pagination.
   */
  private async fetchAllProducts(
    shop: string,
    accessToken: string,
  ): Promise<ShopifyGraphQLProduct[]> {
    const products: ShopifyGraphQLProduct[] = [];

    let hasNextPage = true;
    let after: string | undefined;

    while (hasNextPage) {
      const response =
        await this.shopifyApi.getProducts(
          shop,
          accessToken,
          100,
          after,
        );

      const edges = response.products.edges;

      for (const edge of edges) {
        products.push(edge.node);
      }

      hasNextPage =
        response.products.pageInfo.hasNextPage;

      after =
        response.products.pageInfo.endCursor ?? undefined;
    }

    return products;
  }

  /**
   * Persists all Shopify products, variants and images
   * inside a single database transaction.
   */
  private async persistProducts(
    connection: Prisma.PlatformConnectionGetPayload<{}>,
    products: ShopifyGraphQLProduct[],
  ): Promise<ShopifySyncResult> {
    const counters = {
      products: 0,
      variants: 0,
      images: 0,
    };

    await this.prisma.$transaction(async (tx) => {
      for (const product of products) {
        const savedProduct =
          await this.upsertProduct(
            tx,
            connection,
            product,
          );

        counters.products++;

        counters.variants +=
          await this.upsertVariants(
            tx,
            savedProduct.id,
            product,
          );

        counters.images +=
          await this.upsertImages(
            tx,
            savedProduct.id,
            product,
          );
      }
    });

    return {
      products: counters.products,
      variants: counters.variants,
      images: counters.images,
      duration: 0,
    };
  }
    /**
   * Creates or updates a Shopify product.
   */
  private async upsertProduct(
    tx: Prisma.TransactionClient,
    connection: Prisma.PlatformConnectionGetPayload<{}>,
    product: ShopifyGraphQLProduct,
  ) {
    const featuredImage =
      product.featuredImage?.url ??
      product.images.edges?.[0]?.node?.url ??
      null;

    const tags =
      product.tags?.length > 0
        ? product.tags
        : [];

    const status =
      product.status === 'ACTIVE'
        ? ShopifyProductStatus.ACTIVE
        : product.status === 'ARCHIVED'
        ? ShopifyProductStatus.ARCHIVED
        : ShopifyProductStatus.DRAFT;

    return tx.shopifyProduct.upsert({
      where: {
        platformConnectionId_externalId: {
          platformConnectionId: connection.id,
          externalId: product.id,
        },
      },

      create: {
        organizationId: connection.organizationId,
        platformConnectionId: connection.id,

        externalId: product.id,

        title: product.title,

        handle: product.handle,

        vendor: product.vendor ?? null,

        productType: product.productType ?? null,

        description: product.descriptionHtml ?? null,

        status,

        tags,

        featuredImageUrl: featuredImage,

        metadata: {
          shopifyId: product.id,
        },

        lastSyncedAt: new Date(),
      },

      update: {
        title: product.title,

        handle: product.handle,

        vendor: product.vendor ?? null,

        productType: product.productType ?? null,

        description: product.descriptionHtml ?? null,

        status,

        tags,

        featuredImageUrl: featuredImage,

        metadata: {
          shopifyId: product.id,
        },

        lastSyncedAt: new Date(),

        deletedAt: null,
      },
    });
  }
    /**
   * Creates or updates all variants for a Shopify product.
   */
  private async upsertVariants(
    tx: Prisma.TransactionClient,
    productId: string,
    product: ShopifyGraphQLProduct,
  ): Promise<number> {
    const variants =
      product.variants?.edges ?? [];

    let count = 0;

    for (const edge of variants) {
      const variant = edge.node;

      await tx.shopifyVariant.upsert({
        where: {
          productId_externalId: {
            productId,
            externalId: variant.id,
          },
        },

        create: {
          productId,

          externalId: variant.id,

          title: variant.title,

          sku: variant.sku ?? null,

          barcode: variant.barcode ?? null,

          price: variant.price
            ? new Prisma.Decimal(variant.price)
            : null,

          compareAtPrice: variant.compareAtPrice
            ? new Prisma.Decimal(
                variant.compareAtPrice,
              )
            : null,

          inventoryQuantity:
            variant.inventoryQuantity ?? 0,

          option1:
            variant.selectedOptions?.[0]?.value ??
            null,

          option2:
            variant.selectedOptions?.[1]?.value ??
            null,

          option3:
            variant.selectedOptions?.[2]?.value ??
            null,

          weight:
            variant.weight !== undefined &&
            variant.weight !== null
              ? new Prisma.Decimal(
                  variant.weight,
                )
              : null,

          metadata: {
            shopifyId: variant.id,
            selectedOptions:
              variant.selectedOptions,
          },
        },

        update: {
          title: variant.title,

          sku: variant.sku ?? null,

          barcode: variant.barcode ?? null,

          price: variant.price
            ? new Prisma.Decimal(variant.price)
            : null,

          compareAtPrice: variant.compareAtPrice
            ? new Prisma.Decimal(
                variant.compareAtPrice,
              )
            : null,

          inventoryQuantity:
            variant.inventoryQuantity ?? 0,

          option1:
            variant.selectedOptions?.[0]?.value ??
            null,

          option2:
            variant.selectedOptions?.[1]?.value ??
            null,

          option3:
            variant.selectedOptions?.[2]?.value ??
            null,

          weight:
            variant.weight !== undefined &&
            variant.weight !== null
              ? new Prisma.Decimal(
                  variant.weight,
                )
              : null,

          metadata: {
            shopifyId: variant.id,
            selectedOptions:
              variant.selectedOptions,
          },
        },
      });

      count++;
    }

    return count;
  }
    /**
   * Creates or updates all images for a Shopify product.
   */
  /**
   * Creates or updates all images for a Shopify product.
   */
  private async upsertImages(
    tx: Prisma.TransactionClient,
    productId: string,
    product: ShopifyGraphQLProduct,
  ): Promise<number> {
    const images =
      product.images?.edges ?? [];

    let count = 0;

    for (const edge of images) {
      const image = edge.node;

      await tx.shopifyImage.upsert({
        where: {
          productId_externalId: {
            productId,
            externalId: image.id,
          },
        },

        create: {
          productId,

          externalId: image.id,

          url: image.url,

          alt: image.altText ?? null,

          width: image.width ?? null,

          height: image.height ?? null,

          displayOrder: count,

          createdAt: new Date(),

          updatedAt: new Date(),
        },

        update: {
          url: image.url,

          alt: image.altText ?? null,

          width: image.width ?? null,

          height: image.height ?? null,

          displayOrder: count,

          updatedAt: new Date(),
        },
      });

      count++;
    }

    return count;
  }
}