import { Injectable } from '@nestjs/common';

import {
  ShopifyImage,
  ShopifyProduct,
  ShopifyVariant,
  PlatformConnection,
} from '@prisma/client';

import { ShopifyStoreResponseDto } from '../dto/shopify-store-response.dto';
import {
  ShopifyProductImageResponseDto,
  ShopifyProductResponseDto,
  ShopifyProductVariantResponseDto,
} from '../dto/shopify-product-response.dto';

@Injectable()
export class ShopifyMapper {
  toStoreResponse(
    connection: PlatformConnection,
  ): ShopifyStoreResponseDto {
    return {
      id: connection.id,
      organizationId: connection.organizationId,
      platformConnectionId: connection.id,

      shopId: connection.accountId,
      shopName: connection.accountName,
      shopDomain: connection.externalName ?? '',

      email: (connection.metadata as any)?.email ?? null,
      currency: (connection.metadata as any)?.currency ?? null,
      timezone: (connection.metadata as any)?.timezone ?? null,

      status: connection.status,

      connectedAt: connection.createdAt,
      lastSyncedAt: connection.lastSyncedAt,
    };
  }

  toProductResponse(
    product: ShopifyProduct & {
      variants: ShopifyVariant[];
      images: ShopifyImage[];
    },
  ): ShopifyProductResponseDto {
    return {
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

      variants: product.variants.map((variant) =>
        this.toVariantResponse(variant),
      ),

      images: product.images.map((image) =>
        this.toImageResponse(image),
      ),

      lastSyncedAt: product.lastSyncedAt,

      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private toVariantResponse(
    variant: ShopifyVariant,
  ): ShopifyProductVariantResponseDto {
    return {
      id: variant.id,

      externalId: variant.externalId,

      title: variant.title,

      sku: variant.sku,

      barcode: variant.barcode,

      price: variant.price?.toString() ?? null,

      compareAtPrice:
        variant.compareAtPrice?.toString() ?? null,

      inventoryQuantity:
        variant.inventoryQuantity,
    };
  }

  private toImageResponse(
    image: ShopifyImage,
  ): ShopifyProductImageResponseDto {
    return {
      id: image.id,

      url: image.url,

      alt: image.alt,

      width: image.width,

      height: image.height,

      displayOrder: image.displayOrder,
    };
  }

  toProductResponses(
    products: (ShopifyProduct & {
      variants: ShopifyVariant[];
      images: ShopifyImage[];
    })[],
  ): ShopifyProductResponseDto[] {
    return products.map((product) =>
      this.toProductResponse(product),
    );
  }
}