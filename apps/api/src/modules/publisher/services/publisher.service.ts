import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConnectionStatus, PlatformType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { StoresService } from '../../stores/services/stores.service';
import { PUBLISHER_V1_PLATFORMS } from '../constants/publisher.constants';
import { PublishCampaignDto } from '../dto/publish-campaign.dto';
import {
  PublishCampaignResponseDto,
  PublisherPlatformsResponseDto,
  PublishValidationResponseDto,
} from '../dto/publish-campaign-response.dto';
import { PublisherPlatform } from '../enums/publisher.enums';
import { PublisherMapper } from '../mappers/publisher.mapper';
import type { PublishRequest } from '../providers/interfaces/publisher-provider.interface';
import { PublisherRegistry } from '../providers/publisher.registry';

@Injectable()
export class PublisherService {
  private readonly logger = new Logger(PublisherService.name);

  constructor(
    private readonly registry: PublisherRegistry,
    private readonly mapper: PublisherMapper,
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
  ) {}

  /**
   * Returns registered providers and the full publisher roadmap.
   */
  listPlatforms(): PublisherPlatformsResponseDto {
    return this.mapper.toPlatformsResponse(this.registry.listRegistered());
  }

  /**
   * Structural + provider validation. Does not mutate platform state.
   */
  async validate(
    dto: PublishCampaignDto,
    currentUser: JwtPayload,
  ): Promise<PublishValidationResponseDto> {
    const request = await this.toPublishRequest(dto, currentUser);
    this.assertOrganizationAccess(request.organizationId, currentUser);
    this.assertSupportedPlatform(request.platform);
    await this.assertMetaAdvertisingConfiguration(request, currentUser);
    await this.prepareMetaPublishRequest(request, currentUser);

    const provider = this.registry.get(request.platform);
    const result = await provider.validate(request);

    return this.mapper.toValidationResponse(result);
  }

  /**
   * Routes a publish request to the registered provider for the platform.
   */
  async publish(
    dto: PublishCampaignDto,
    currentUser: JwtPayload,
  ): Promise<PublishCampaignResponseDto> {
    const request = await this.toPublishRequest(dto, currentUser);
    this.logger.log(
      `publish() enter campaignId=${request.campaignId} organizationId=${request.organizationId} userId=${currentUser.sub}`,
    );

    try {
      this.assertOrganizationAccess(request.organizationId, currentUser);
      this.assertSupportedPlatform(request.platform);
      this.logger.log(
        `publish() before assertMetaAdvertisingConfiguration campaignId=${request.campaignId}`,
      );
      await this.assertMetaAdvertisingConfiguration(request, currentUser);
      await this.prepareMetaPublishRequest(request, currentUser);
      this.logger.log(
        `publish() after assertMetaAdvertisingConfiguration campaignId=${request.campaignId}`,
      );

      const provider = this.registry.get(request.platform);

      const validation = await provider.validate(request);
      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Publish request failed validation.',
          platform: validation.platform,
          issues: validation.issues,
        });
      }

      const result = await provider.publish(request);
      const response = this.mapper.toPublishResponse(result);
      this.logger.log(
        `publish() result success=${response.success} status=${response.status} ` +
          `hasDiagnostics=${Boolean(response.diagnostics)} ` +
          `diagnosticsStage=${response.diagnostics?.stage ?? 'n/a'} ` +
          `diagnosticsErrorCode=${response.diagnostics?.errorCode ?? 'n/a'} ` +
          `issues=${response.issues.length}`,
      );
      return response;
    } catch (error) {
      const exception = error as {
        constructor?: { name?: string };
        message?: string;
        response?: unknown;
        stack?: string;
      };
      this.logger.error(
        `publish() exception class=${exception.constructor?.name ?? 'UnknownError'} message=${exception.message ?? 'Unknown error'}`,
      );
      this.logger.error(
        `publish() exception.response=${JSON.stringify(exception.response ?? null)}`,
      );
      this.logger.error(
        `publish() exception.stack=${exception.stack ?? 'No stack trace'}`,
      );
      throw error;
    }
  }

  isPlatformRegistered(platform: PublisherPlatform): boolean {
    return this.registry.has(platform);
  }

  private async assertMetaAdvertisingConfiguration(
    request: PublishRequest,
    currentUser: JwtPayload,
  ): Promise<void> {
    if (request.platform !== PublisherPlatform.META) {
      return;
    }

    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: request.campaignId,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
      select: { shopifyStoreId: true },
    });

    if (!campaign?.shopifyStoreId) {
      throw new BadRequestException(
        'Campaign is missing a Shopify store. Complete Advertising Configuration, then publish from a store-linked draft.',
      );
    }

    await this.storesService.assertMetaPublishReady(
      campaign.shopifyStoreId,
      currentUser,
    );
  }

  private async prepareMetaPublishRequest(
    request: PublishRequest,
    currentUser: JwtPayload,
  ): Promise<void> {
    if (request.platform !== PublisherPlatform.META) {
      return;
    }

    await this.injectMetaPageIdFromStoreConfiguration(request, currentUser);
    await this.reconcileCampaignAdAccountFromStoreConfiguration(
      request,
      currentUser,
    );
    await this.assertMetaAdAccountHasActiveCredentials(request, currentUser);
    await this.backfillCreativePublishFields(request, currentUser);
  }

  private async injectMetaPageIdFromStoreConfiguration(
    request: PublishRequest,
    currentUser: JwtPayload,
  ): Promise<void> {
    const existingPageId = request.options?.pageId;
    if (typeof existingPageId === 'string' && existingPageId.trim()) {
      return;
    }

    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: request.campaignId,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
      select: { shopifyStoreId: true },
    });

    if (!campaign?.shopifyStoreId) {
      return;
    }

    const advertisingConfig =
      await this.prisma.storeAdvertisingConfiguration.findUnique({
        where: { shopifyStoreId: campaign.shopifyStoreId },
        select: { facebookPageId: true },
      });

    const facebookPageId = advertisingConfig?.facebookPageId?.trim();
    if (!facebookPageId) {
      return;
    }

    request.options = {
      ...(request.options ?? {}),
      pageId: facebookPageId,
    };
  }

  /**
   * Draft campaigns may still point at the local pending AdAccount when Meta
   * Advertising Configuration was completed after draft save. Reconcile the
   * campaign (and request) to the store-selected Meta AdAccount before
   * credential checks and provider validation (which enforce AD_ACCOUNT_MISMATCH).
   */
  private async reconcileCampaignAdAccountFromStoreConfiguration(
    request: PublishRequest,
    currentUser: JwtPayload,
  ): Promise<void> {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: request.campaignId,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        shopifyStoreId: true,
        adAccountId: true,
      },
    });

    if (!campaign?.shopifyStoreId) {
      return;
    }

    const advertisingConfig =
      await this.prisma.storeAdvertisingConfiguration.findUnique({
        where: { shopifyStoreId: campaign.shopifyStoreId },
        select: { adAccountId: true },
      });

    const configuredAdAccountId = advertisingConfig?.adAccountId?.trim();
    if (!configuredAdAccountId) {
      return;
    }

    if (campaign.adAccountId !== configuredAdAccountId) {
      await this.prisma.campaign.update({
        where: { id: campaign.id },
        data: { adAccountId: configuredAdAccountId },
      });
    }

    request.adAccountId = configuredAdAccountId;
  }

  private async assertMetaAdAccountHasActiveCredentials(
    request: PublishRequest,
    currentUser: JwtPayload,
  ): Promise<void> {
    // TEMP debug — remove after credential-link investigation
    const campaignForLog = await this.prisma.campaign.findFirst({
      where: {
        id: request.campaignId,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
      select: { adAccountId: true, shopifyStoreId: true },
    });
    const storeConfigForLog = campaignForLog?.shopifyStoreId
      ? await this.prisma.storeAdvertisingConfiguration.findUnique({
          where: { shopifyStoreId: campaignForLog.shopifyStoreId },
          select: { adAccountId: true },
        })
      : null;
    this.logger.warn(
      `[TEMP assertMetaCreds] request.adAccountId=${request.adAccountId} campaign.adAccountId=${campaignForLog?.adAccountId ?? null} storeAdvertisingConfiguration.adAccountId=${storeConfigForLog?.adAccountId ?? null} organizationId=${currentUser.organizationId}`,
    );

    const adAccountWhere = {
      id: request.adAccountId,
      organizationId: currentUser.organizationId,
      platform: PlatformType.META,
      deletedAt: null,
    };
    const adAccount = await this.prisma.adAccount.findFirst({
      where: adAccountWhere,
      select: {
        id: true,
        platformConnectionId: true,
        accountName: true,
        externalId: true,
        organizationId: true,
        platform: true,
        deletedAt: true,
      },
    });
    this.logger.warn(
      `[TEMP assertMetaCreds] adAccountRow=${JSON.stringify(adAccount)} where=${JSON.stringify(adAccountWhere)}`,
    );

    if (!adAccount?.platformConnectionId) {
      this.logger.warn(
        `[TEMP assertMetaCreds] THROW branch=noAdAccountOrMissingPlatformConnectionId adAccountFound=${Boolean(adAccount)} platformConnectionId=${adAccount?.platformConnectionId ?? null}`,
      );
      throw new BadRequestException(
        'The selected Meta Ad Account is not linked to an active Meta connection. Reconnect Meta or select another Ad Account.',
      );
    }

    this.logger.warn(
      `[TEMP assertMetaCreds] adAccount.platformConnectionId=${adAccount.platformConnectionId}`,
    );

    const connectionWhere = {
      id: adAccount.platformConnectionId,
      organizationId: currentUser.organizationId,
      platform: PlatformType.META,
      status: ConnectionStatus.ACTIVE,
      deletedAt: null,
    };
    const connection = await this.prisma.platformConnection.findFirst({
      where: connectionWhere,
      select: {
        id: true,
        status: true,
        platform: true,
        organizationId: true,
        deletedAt: true,
        accountName: true,
      },
    });
    this.logger.warn(
      `[TEMP assertMetaCreds] platformConnectionRow=${JSON.stringify(connection)} where=${JSON.stringify(connectionWhere)}`,
    );

    if (!connection) {
      const connectionAny = await this.prisma.platformConnection.findFirst({
        where: { id: adAccount.platformConnectionId },
        select: {
          id: true,
          status: true,
          platform: true,
          organizationId: true,
          deletedAt: true,
        },
      });
      this.logger.warn(
        `[TEMP assertMetaCreds] THROW branch=connectionNotFoundWithActiveFilters connectionAny=${JSON.stringify(connectionAny)}`,
      );
      throw new BadRequestException(
        'The selected Meta Ad Account is not linked to an active Meta connection. Reconnect Meta or select another Ad Account.',
      );
    }

    this.logger.warn(
      `[TEMP assertMetaCreds] platformConnection.id=${connection.id}`,
    );

    const credentialWhere = {
      platformConnectionId: connection.id,
      isActive: true,
      revokedAt: null,
    };
    const credential = await this.prisma.platformCredential.findFirst({
      where: credentialWhere,
      select: { id: true, accessToken: true, isActive: true, revokedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const credentialsAll = await this.prisma.platformCredential.findMany({
      where: { platformConnectionId: connection.id },
      select: {
        id: true,
        isActive: true,
        revokedAt: true,
        createdAt: true,
        accessToken: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    this.logger.warn(
      `[TEMP assertMetaCreds] credentialQueryWhere=${JSON.stringify(credentialWhere)} credentialRow=${JSON.stringify(credential ? { id: credential.id, isActive: credential.isActive, revokedAt: credential.revokedAt, hasAccessToken: Boolean(credential.accessToken?.trim()) } : null)}`,
    );
    this.logger.warn(
      `[TEMP assertMetaCreds] credentialsAllForConnection=${JSON.stringify(credentialsAll.map((c) => ({ id: c.id, isActive: c.isActive, revokedAt: c.revokedAt, hasAccessToken: Boolean(c.accessToken?.trim()), createdAt: c.createdAt })))}`,
    );

    if (!credential?.accessToken?.trim()) {
      this.logger.warn(
        `[TEMP assertMetaCreds] THROW branch=noActiveCredentialOrEmptyAccessToken platformCredential.id=${credential?.id ?? null} platformCredential.isActive=${credential?.isActive ?? null} platformCredential.revokedAt=${credential?.revokedAt ?? null}`,
      );
      throw new BadRequestException(
        'The selected Meta Ad Account is not linked to an active Meta connection. Reconnect Meta or select another Ad Account.',
      );
    }

    this.logger.warn(
      `[TEMP assertMetaCreds] PASS platformCredential.id=${credential.id} platformCredential.isActive=${credential.isActive} platformCredential.revokedAt=${credential.revokedAt}`,
    );
  }

  private async backfillCreativePublishFields(
    request: PublishRequest,
    currentUser: JwtPayload,
  ): Promise<void> {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: request.campaignId,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
      select: {
        shopifyStoreId: true,
        metadata: true,
      },
    });

    if (!campaign?.shopifyStoreId) {
      return;
    }

    const metadata = (campaign.metadata ?? {}) as Record<string, unknown>;
    const productId =
      typeof metadata.productId === 'string' ? metadata.productId : null;
    if (!productId) {
      return;
    }

    const product = await this.prisma.shopifyProduct.findFirst({
      where: {
        id: productId,
        organizationId: currentUser.organizationId,
        platformConnectionId: campaign.shopifyStoreId,
        deletedAt: null,
      },
      select: {
        handle: true,
        featuredImageUrl: true,
        images: {
          where: { url: { not: '' } },
          orderBy: { displayOrder: 'asc' },
          select: { url: true },
        },
      },
    });
    if (!product) {
      return;
    }

    const storeConnection = await this.prisma.platformConnection.findFirst({
      where: {
        id: campaign.shopifyStoreId,
        organizationId: currentUser.organizationId,
        platform: PlatformType.SHOPIFY,
        deletedAt: null,
      },
      select: { accountId: true, externalName: true },
    });

    const sourceImageUrls = product.images
      .map((image) => image.url.trim())
      .filter((url) => url.length > 0);
    const featuredImageUrl = product.featuredImageUrl?.trim() || null;
    const landingPageUrl = this.resolveShopifyLandingPageUrl(
      storeConnection?.externalName ?? storeConnection?.accountId ?? null,
      product.handle,
    );

    const creatives = await this.prisma.creative.findMany({
      where: {
        organizationId: currentUser.organizationId,
        deletedAt: null,
        ads: {
          some: {
            deletedAt: null,
            adSet: {
              deletedAt: null,
              campaignId: request.campaignId,
            },
          },
        },
      },
      select: {
        id: true,
        metadata: true,
        landingPageUrl: true,
      },
    });

    for (const creative of creatives) {
      const currentMetadata = (creative.metadata ?? {}) as Record<string, unknown>;
      const updates: Record<string, unknown> = {};

      const hasSourceImageUrls =
        Array.isArray(currentMetadata.sourceImageUrls) &&
        currentMetadata.sourceImageUrls.length > 0;
      if (!hasSourceImageUrls && sourceImageUrls.length > 0) {
        updates.sourceImageUrls = sourceImageUrls;
      }

      const hasFeaturedImageUrl =
        typeof currentMetadata.featuredImageUrl === 'string' &&
        currentMetadata.featuredImageUrl.trim().length > 0;
      if (!hasFeaturedImageUrl && featuredImageUrl) {
        updates.featuredImageUrl = featuredImageUrl;
      }

      const nextLandingPageUrl =
        creative.landingPageUrl?.trim() || landingPageUrl || null;

      if (Object.keys(updates).length === 0 && nextLandingPageUrl === creative.landingPageUrl) {
        continue;
      }

      await this.prisma.creative.update({
        where: { id: creative.id },
        data: {
          metadata:
            Object.keys(updates).length > 0
              ? ({
                  ...currentMetadata,
                  ...updates,
                } as Prisma.InputJsonValue)
              : (currentMetadata as Prisma.InputJsonValue),
          ...(nextLandingPageUrl && !creative.landingPageUrl
            ? { landingPageUrl: nextLandingPageUrl }
            : {}),
        },
      });
    }
  }

  private resolveShopifyLandingPageUrl(
    shopDomainRaw: string | null,
    productHandle: string | null,
  ): string | null {
    const handle = productHandle?.trim();
    if (!handle) {
      return null;
    }

    const normalizedDomain = shopDomainRaw?.trim();
    if (!normalizedDomain) {
      return null;
    }

    const domain = normalizedDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    if (!domain) {
      return null;
    }

    return `https://${domain}/products/${handle}`;
  }

  private async toPublishRequest(
    dto: PublishCampaignDto,
    currentUser: JwtPayload,
  ): Promise<PublishRequest> {
    return {
      organizationId: dto.organizationId,
      campaignId: dto.campaignId,
      platform: dto.platform,
      adAccountId: dto.adAccountId,
      entityIds: dto.entityIds
        ? {
            adSetIds: dto.entityIds.adSetIds,
            adIds: dto.entityIds.adIds,
            creativeIds: dto.entityIds.creativeIds,
          }
        : undefined,
      options: dto.options,
      requestedByUserId: currentUser.sub,
    };
  }

  private assertOrganizationAccess(
    organizationId: string,
    currentUser: JwtPayload,
  ): void {
    if (organizationId !== currentUser.organizationId) {
      throw new BadRequestException(
        'organizationId does not match the authenticated organization.',
      );
    }
  }

  private assertSupportedPlatform(platform: PublisherPlatform): void {
    if (!PUBLISHER_V1_PLATFORMS.includes(platform)) {
      throw new BadRequestException(
        `Platform ${platform} is not supported in v1. Supported: ${PUBLISHER_V1_PLATFORMS.join(', ')}.`,
      );
    }
  }
}
