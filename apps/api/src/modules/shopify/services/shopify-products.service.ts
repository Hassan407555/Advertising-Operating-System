// import {
//   Injectable,
//   BadRequestException,
//   NotFoundException,
//   InternalServerErrorException,
// } from '@nestjs/common';

// import {
//   AuditAction,
//   AuditEntity,
//   ConnectionStatus,
//   PlatformType,
//   Prisma,
//   ShopifyProductStatus,
//   SyncStatus,
// } from '@prisma/client';

// import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
// import { EncryptionService } from '../../encryption/services/encryption.service';
// import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';

// import { ShopifyApiService } from './shopify-api.service';

// import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
// import type {
//   ShopifyGraphQLProduct,
// } from '../interfaces/shopify-product.interface';

// import type { ShopifySyncResult } from '../interfaces/shopify-sync-result.interface';
// @Injectable()
// export class ShopifyProductsService {
//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly encryptionService: EncryptionService,
//     private readonly auditLogsService: AuditLogsService,
//     private readonly shopifyApi: ShopifyApiService,
//   ) {}

//   async syncProducts(
//     currentUser: JwtPayload,
//   ): Promise<ShopifySyncResult> {
//     const startedAt = Date.now();

//     const connection =
//       await this.prisma.platformConnection.findFirst({
//         where: {
//           organizationId: currentUser.organizationId,
//           platform: PlatformType.SHOPIFY,
//           deletedAt: null,
//           status: ConnectionStatus.ACTIVE,
//         },
//       });

//     if (!connection) {
//       throw new NotFoundException(
//         'No active Shopify connection found.',
//       );
//     }

//     const credential =
//       await this.prisma.platformCredential.findFirst({
//         where: {
//           platformConnectionId: connection.id,
//           isActive: true,
//           revokedAt: null,
//         },
//       });

//     if (!credential) {
//       throw new BadRequestException(
//         'Shopify credentials not found.',
//       );
//     }

//     const accessToken =
//       this.encryptionService.decrypt(
//         credential.accessToken,
//       );

//     await this.prisma.platformConnection.update({
//       where: {
//         id: connection.id,
//       },
//       data: {
//         syncStatus: SyncStatus.SYNCING,
//       },
//     });

//     try {
//       const products =
//         await this.fetchAllProducts(
//           connection.externalName!,
//           accessToken,
//         );

//       const summary =
//         await this.persistProducts(
//           connection,
//           products,
//         );

//       await this.prisma.platformConnection.update({
//         where: {
//           id: connection.id,
//         },
//         data: {
//           syncStatus: SyncStatus.SYNCED,
//           lastSyncedAt: new Date(),
//           lastSuccessfulSyncAt: new Date(),
//         },
//       });

//       await this.auditLogsService.log({
//         organizationId: currentUser.organizationId,
//         actorId: currentUser.userId,
//         action: AuditAction.PLATFORM_CONNECTED,
//         entity: AuditEntity.PLATFORM,
//         entityId: connection.id,
//         metadata: {
//           syncedProducts: summary.products,
//           syncedVariants: summary.variants,
//           syncedImages: summary.images,
//         },
//       });

//       return {
//         ...summary,
//         duration: Date.now() - startedAt,
//       };
//     } catch (error) {
//       await this.prisma.platformConnection.update({
//         where: {
//           id: connection.id,
//         },
//         data: {
//           syncStatus: SyncStatus.FAILED,
//           lastFailedSyncAt: new Date(),
//         },
//       });

//       throw new InternalServerErrorException(
//         error instanceof Error
//           ? error.message
//           : 'Shopify synchronization failed.',
//       );
//     }
//   }

//   /**
//    * Fetches every product from Shopify.
//    */
//   /**
//  * Fetches every product from Shopify.
//  */
// private async fetchAllProducts(
//   shop: string,
//   accessToken: string,
// ): Promise<ShopifyGraphQLProduct[]> {
//   // NEXT CHUNK
//   return [];
// }

// /**
//  * Persists all Shopify products inside a single transaction.
//  */
// private async persistProducts(
//   connection: Prisma.PlatformConnectionGetPayload<{}>,
//   products: ShopifyGraphQLProduct[],
// ): Promise<ShopifySyncResult> {
//   const counters = {
//     products: 0,
//     variants: 0,
//     images: 0,
//   };

//   await this.prisma.$transaction(async (tx) => {
//     for (const product of products) {
//       const savedProduct = await this.upsertProduct(
//         tx,
//         connection,
//         product,
//       );

//       counters.products++;

//       counters.variants += await this.upsertVariants(
//         tx,
//         savedProduct.id,
//         product,
//       );

//       counters.images += await this.upsertImages(
//         tx,
//         savedProduct.id,
//         product,
//       );
//     }
//   });

//   return {
//     products: counters.products,
//     variants: counters.variants,
//     images: counters.images,
//     duration: 0,
//   };
// }

// /**
//  * Creates or updates one Shopify product.
//  */
// private async upsertProduct(
//   tx: Prisma.TransactionClient,
//   connection: Prisma.PlatformConnectionGetPayload<{}>,
//   product: ShopifyGraphQLProduct,
// ) {
//   // NEXT CHUNK
//   throw new Error('Not implemented');
// }

// /**
//  * Creates or updates variants.
//  */
// private async upsertVariants(
//   tx: Prisma.TransactionClient,
//   productId: string,
//   product: ShopifyGraphQLProduct,
// ): Promise<number> {
//   // NEXT CHUNK
//   return 0;
// }

// /**
//  * Creates or updates images.
//  */
// private async upsertImages(
//   tx: Prisma.TransactionClient,
//   productId: string,
//   product: ShopifyGraphQLProduct,
// ): Promise<number> {
//   // NEXT CHUNK
//   return 0;
// }

// /**
//  * Creates or updates one Shopify product.
//  */
// private async upsertProduct(
//   tx: Prisma.TransactionClient,
//   connection: Prisma.PlatformConnectionGetPayload<{}>,
//   product: ShopifyGraphQLProduct,
// ) {
//   const featuredImage =
//     product.featuredImage?.url ??
//     product.images?.edges?.[0]?.node?.url ??
//     null;

//   const tags =
//     product.tags?.length
//       ? product.tags
//       : [];

//   const metadata = {
//     shopifyId: product.id,
//     onlineStoreUrl: product.onlineStoreUrl,
//     totalInventory: product.totalInventory,
//     tracksInventory: product.tracksInventory,
//     createdAt: product.createdAt,
//     updatedAt: product.updatedAt,
//     publishedAt: product.publishedAt,
//   };

//   return tx.shopifyProduct.upsert({
//     where: {
//       platformConnectionId_externalId: {
//         platformConnectionId: connection.id,
//         externalId: product.id,
//       },
//     },

//     create: {
//       organizationId: connection.organizationId,
//       platformConnectionId: connection.id,

//       externalId: product.id,

//       title: product.title,

//       handle: product.handle,

//       vendor: product.vendor,

//       productType: product.productType,

//       description: product.descriptionHtml,

//       status:
//         product.status === 'ACTIVE'
//           ? ShopifyProductStatus.ACTIVE
//           : product.status === 'ARCHIVED'
//           ? ShopifyProductStatus.ARCHIVED
//           : ShopifyProductStatus.DRAFT,

//       tags,

//       featuredImageUrl: featuredImage,

//       metadata,

//       lastSyncedAt: new Date(),
//     },

//     update: {
//       title: product.title,

//       handle: product.handle,

//       vendor: product.vendor,

//       productType: product.productType,

//       description: product.descriptionHtml,

//       status:
//         product.status === 'ACTIVE'
//           ? ShopifyProductStatus.ACTIVE
//           : product.status === 'ARCHIVED'
//           ? ShopifyProductStatus.ARCHIVED
//           : ShopifyProductStatus.DRAFT,

//       tags,

//       featuredImageUrl: featuredImage,

//       metadata,

//       lastSyncedAt: new Date(),

//       deletedAt: null,
//     },
//   });
// }

//     /**
//  * Creates or updates all variants for a Shopify product.
//  */
// private async upsertVariants(
//   tx: Prisma.TransactionClient,
//   productId: string,
//   product: ShopifyGraphQLProduct,
// ): Promise<number> {
//   const variants = product.variants?.edges ?? [];

//   let count = 0;

//   for (const edge of variants) {
//     const variant = edge.node;

//     await tx.shopifyVariant.upsert({
//       where: {
//         productId_externalId: {
//           productId,
//           externalId: variant.id,
//         },
//       },

//       create: {
//         productId,

//         externalId: variant.id,

//         title: variant.title,

//         sku: variant.sku || null,

//         barcode: variant.barcode || null,

//         price: variant.price
//           ? new Prisma.Decimal(variant.price)
//           : null,

//         compareAtPrice: variant.compareAtPrice
//           ? new Prisma.Decimal(variant.compareAtPrice)
//           : null,

//         inventoryQuantity:
//           variant.inventoryQuantity ?? 0,

//         option1: variant.selectedOptions?.[0]?.value ?? null,

//         option2: variant.selectedOptions?.[1]?.value ?? null,

//         option3: variant.selectedOptions?.[2]?.value ?? null,

//         weight: variant.weight
//           ? new Prisma.Decimal(variant.weight)
//           : null,

//         metadata: {
//           inventoryPolicy: variant.inventoryPolicy,
//           taxable: variant.taxable,
//           requiresShipping: variant.requiresShipping,
//           createdAt: variant.createdAt,
//           updatedAt: variant.updatedAt,
//         },
//       },

//       update: {
//         title: variant.title,

//         sku: variant.sku || null,

//         barcode: variant.barcode || null,

//         price: variant.price
//           ? new Prisma.Decimal(variant.price)
//           : null,

//         compareAtPrice: variant.compareAtPrice
//           ? new Prisma.Decimal(variant.compareAtPrice)
//           : null,

//         inventoryQuantity:
//           variant.inventoryQuantity ?? 0,

//         option1: variant.selectedOptions?.[0]?.value ?? null,

//         option2: variant.selectedOptions?.[1]?.value ?? null,

//         option3: variant.selectedOptions?.[2]?.value ?? null,

//         weight: variant.weight
//           ? new Prisma.Decimal(variant.weight)
//           : null,

//         metadata: {
//           inventoryPolicy: variant.inventoryPolicy,
//           taxable: variant.taxable,
//           requiresShipping: variant.requiresShipping,
//           createdAt: variant.createdAt,
//           updatedAt: variant.updatedAt,
//         },
//       },
//     });

//     count++;
//   }

//   return count;
// }
// }