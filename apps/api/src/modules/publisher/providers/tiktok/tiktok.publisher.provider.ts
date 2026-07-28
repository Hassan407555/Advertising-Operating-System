import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  CallToAction,
  ConnectionStatus,
  CreativeAssetType,
  CreativeType,
  MembershipRole,
  PlatformType,
  Prisma,
  PublishJobStatus,
} from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../infrastructure/encryption/encryption.service';
import type { JwtPayload } from '../../../auth/interfaces/jwt-payload.interface';
import { AdAccountsService } from '../../../ad-accounts/ad-accounts.service';
import { AdsService } from '../../../ads/ads.service';
import type { AdResponseDto } from '../../../ads/dto/ad-response.dto';
import { AdSetsService } from '../../../ad-sets/services/ad-sets.service';
import type { AdSetResponseDto } from '../../../ad-sets/dto/ad-set-response.dto';
import { CampaignsService } from '../../../campaigns/services/campaigns.service';
import type { CampaignResponseDto } from '../../../campaigns/dto/campaign-response.dto';
import { CreativesService } from '../../../creatives/creatives.service';
import type { CreativeResponseDto } from '../../../creatives/dto/creative-response.dto';
import { CreativeAssetsService } from '../../../creative-assets/creative-assets.service';
import { PlatformConnectionsService } from '../../../platform-connections/platform-connections.service';
import { StorageService } from '../../../storage/services/storage.service';

import {
  PublishEntityType,
  PublishStatus,
  PublisherPlatform,
} from '../../enums/publisher.enums';
import type {
  PublishEntityResult,
  PublishRequest,
  PublishResult,
  PublishValidationIssue,
  PublishValidationResult,
  PublisherProvider,
} from '../interfaces/publisher-provider.interface';
import { PublisherRegistry } from '../publisher.registry';
import {
  TIKTOK_OPERATION_STATUS_PAUSED,
  TIKTOK_V1_COUNTRY_LOCATION_IDS,
  TIKTOK_V1_CTA_MAP,
  TIKTOK_V1_OBJECTIVE_MAP,
  TIKTOK_V1_SUPPORTED_CREATIVE_TYPES,
  TIKTOK_V1_SUPPORTED_VIDEO_MIME_TYPES,
} from './tiktok.constants';
import { TikTokApiClient } from './tiktok-api.client';

interface ResolvedVideoMedia {
  url: string;
  mimeType: string;
  thumbnailUrl: string | null;
}

interface TikTokPublishContext {
  campaign: CampaignResponseDto;
  advertiserId: string;
  accessToken: string;
  identityId: string | null;
  displayName: string;
  dryRun: boolean;
  adSets: AdSetResponseDto[];
  ads: AdResponseDto[];
  creativesById: Map<string, CreativeResponseDto>;
  /**
   * Temporary IMAGE compatibility only (legacy SINGLE_IMAGE).
   * Do not expand — Carousel will replace this path.
   */
  imageUrlByCreativeId: Map<string, string>;
  /** Primary creative path: VIDEO → SINGLE_VIDEO */
  videoByCreativeId: Map<string, ResolvedVideoMedia>;
}

/**
 * TikTok Marketing API publisher — V1 scope:
 * - VIDEO (SINGLE_VIDEO) is the primary creative format
 * - IMAGE (SINGLE_IMAGE) retained temporarily as compatibility only
 * - Existing AI-generated copy fields
 * - Existing campaign → ad set → ad → creative structure
 * - Publish only (entities created as DISABLE / paused)
 */
@Injectable()
export class TikTokPublisherProvider
  implements PublisherProvider, OnModuleInit
{
  readonly platform = PublisherPlatform.TIKTOK;

  private readonly logger = new Logger(TikTokPublisherProvider.name);

  constructor(
    private readonly registry: PublisherRegistry,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly storageService: StorageService,
    private readonly campaignsService: CampaignsService,
    private readonly adAccountsService: AdAccountsService,
    private readonly platformConnectionsService: PlatformConnectionsService,
    private readonly adSetsService: AdSetsService,
    private readonly adsService: AdsService,
    private readonly creativesService: CreativesService,
    private readonly creativeAssetsService: CreativeAssetsService,
    private readonly tikTokApiClient: TikTokApiClient,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async validate(
    request: PublishRequest,
  ): Promise<PublishValidationResult> {
    const issues: PublishValidationIssue[] = [];
    const dryRun = this.isDryRun(request);

    try {
      await this.buildContext(request, issues, dryRun);
    } catch (error) {
      issues.push({
        code: 'TIKTOK_CONTEXT_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to build TikTok publish context.',
      });
    }

    return {
      valid: issues.length === 0,
      platform: this.platform,
      issues,
    };
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    const startedAt = new Date();
    const dryRun = this.isDryRun(request);
    const issues: PublishValidationIssue[] = [];
    const entities: PublishEntityResult[] = [];
    // Intentionally defer local persistence until the remote publish sequence
    // has fully completed, so failed runs do not leave partial local entity state.
    const pendingLocalWrites: Array<{
      entity: 'campaign' | 'adSet' | 'creative' | 'ad';
      id: string;
      data:
        | Prisma.CampaignUpdateInput
        | Prisma.AdSetUpdateInput
        | Prisma.CreativeUpdateInput
        | Prisma.AdUpdateInput;
    }> = [];

    const flushLocalWrites = async (): Promise<void> => {
      if (pendingLocalWrites.length === 0) {
        return;
      }

      const writes = [...pendingLocalWrites];
      pendingLocalWrites.length = 0;

      await this.prisma.$transaction(async (tx) => {
        for (const write of writes) {
          switch (write.entity) {
            case 'campaign':
              await tx.campaign.update({
                where: { id: write.id },
                data: write.data as Prisma.CampaignUpdateInput,
              });
              break;
            case 'adSet':
              await tx.adSet.update({
                where: { id: write.id },
                data: write.data as Prisma.AdSetUpdateInput,
              });
              break;
            case 'creative':
              await tx.creative.update({
                where: { id: write.id },
                data: write.data as Prisma.CreativeUpdateInput,
              });
              break;
            case 'ad':
              await tx.ad.update({
                where: { id: write.id },
                data: write.data as Prisma.AdUpdateInput,
              });
              break;
          }
        }
      });
    };

    const job = await this.prisma.publishJob.create({
      data: {
        organizationId: request.organizationId,
        campaignId: request.campaignId,
        adAccountId: request.adAccountId,
        platform: PlatformType.TIKTOK,
        status: PublishJobStatus.VALIDATING,
        dryRun,
        requestedByUserId: request.requestedByUserId,
        request: request as unknown as Prisma.InputJsonValue,
        startedAt,
      },
    });

    try {
      const context = await this.buildContext(request, issues, dryRun);

      if (issues.length > 0) {
        await this.failJob(job.id, issues, startedAt);
        return this.toResult({
          success: false,
          status: PublishStatus.FAILED,
          campaignId: request.campaignId,
          entities,
          issues,
          startedAt,
        });
      }

      await this.prisma.publishJob.update({
        where: { id: job.id },
        data: { status: PublishJobStatus.PUBLISHING },
      });

      const tikTokObjective =
        TIKTOK_V1_OBJECTIVE_MAP[context.campaign.objective];

      const campaignExternalId = await this.publishCampaign(
        context,
        tikTokObjective,
      );

      entities.push({
        entityType: PublishEntityType.CAMPAIGN,
        entityId: context.campaign.id,
        externalId: campaignExternalId,
        status: PublishStatus.PUBLISHED,
      });

      if (!dryRun) {
        pendingLocalWrites.push({
          entity: 'campaign',
          id: context.campaign.id,
          data: {
            externalId: campaignExternalId,
            externalStatus: TIKTOK_OPERATION_STATUS_PAUSED,
            lastSuccessfulSyncAt: new Date(),
            lastSyncedAt: new Date(),
          },
        });
      }

      for (const adSet of context.adSets) {
        const adSetExternalId = await this.publishAdSet(
          context,
          adSet,
          campaignExternalId,
          tikTokObjective,
        );

        entities.push({
          entityType: PublishEntityType.AD_SET,
          entityId: adSet.id,
          externalId: adSetExternalId,
          status: PublishStatus.PUBLISHED,
        });

        if (!dryRun) {
          pendingLocalWrites.push({
            entity: 'adSet',
            id: adSet.id,
            data: {
              externalId: adSetExternalId,
              externalStatus: TIKTOK_OPERATION_STATUS_PAUSED,
              lastSuccessfulSyncAt: new Date(),
              lastSyncedAt: new Date(),
            },
          });
        }

        const adSetAds = context.ads.filter(
          (ad) => ad.adSetId === adSet.id,
        );

        for (const ad of adSetAds) {
          if (!ad.creativeId) {
            continue;
          }

          const creative = context.creativesById.get(ad.creativeId);
          if (!creative) {
            continue;
          }

          const creativeExternalId = await this.publishCreative(
            context,
            creative,
          );

          entities.push({
            entityType: PublishEntityType.CREATIVE,
            entityId: creative.id,
            externalId: creativeExternalId,
            status: PublishStatus.PUBLISHED,
          });

          if (!dryRun) {
            pendingLocalWrites.push({
              entity: 'creative',
              id: creative.id,
              data: {
                externalId: creativeExternalId,
                lastSuccessfulSyncAt: new Date(),
                lastSyncedAt: new Date(),
              },
            });
          }

          const adExternalId = await this.publishAd(
            context,
            ad,
            adSetExternalId,
            creative,
            creativeExternalId,
          );

          entities.push({
            entityType: PublishEntityType.AD,
            entityId: ad.id,
            externalId: adExternalId,
            status: PublishStatus.PUBLISHED,
          });

          if (!dryRun) {
            pendingLocalWrites.push({
              entity: 'ad',
              id: ad.id,
              data: {
                externalId: adExternalId,
                externalStatus: TIKTOK_OPERATION_STATUS_PAUSED,
                lastSuccessfulSyncAt: new Date(),
                lastSyncedAt: new Date(),
              },
            });
          }
        }
      }

      await flushLocalWrites();

      const completedAt = new Date();
      const result = this.toResult({
        success: true,
        status: PublishStatus.PUBLISHED,
        campaignId: request.campaignId,
        externalCampaignId: campaignExternalId,
        entities,
        issues,
        startedAt,
        completedAt,
        raw: { dryRun },
      });

      await this.prisma.publishJob.update({
        where: { id: job.id },
        data: {
          status: PublishJobStatus.COMPLETED,
          result: result as unknown as Prisma.InputJsonValue,
          completedAt,
        },
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'TikTok publish failed.';
      this.logger.error(message);

      issues.push({
        code: 'TIKTOK_PUBLISH_FAILED',
        message,
      });

      const hasPublishedEntities = entities.some(
        (entity) => entity.status === PublishStatus.PUBLISHED,
      );
      const terminalJobStatus = hasPublishedEntities
        ? PublishJobStatus.PARTIAL
        : PublishJobStatus.FAILED;
      const terminalStatus = hasPublishedEntities
        ? PublishStatus.PARTIAL
        : PublishStatus.FAILED;

      // Do not flush pending local writes on failure; this keeps local persistence
      // deterministic and retry-safe even when remote calls partially succeeded.
      await this.failJob(
        job.id,
        issues,
        startedAt,
        message,
        terminalJobStatus,
        entities,
      );

      return this.toResult({
        success: false,
        status: terminalStatus,
        campaignId: request.campaignId,
        entities,
        issues,
        startedAt,
      });
    }
  }

  private async buildContext(
    request: PublishRequest,
    issues: PublishValidationIssue[],
    dryRun: boolean,
  ): Promise<TikTokPublishContext> {
    const currentUser = this.toSystemUser(request);

    const campaign = await this.campaignsService.findOne(
      request.campaignId,
      currentUser,
    );

    if (campaign.adAccountId !== request.adAccountId) {
      issues.push({
        code: 'AD_ACCOUNT_MISMATCH',
        message: 'adAccountId does not match the campaign ad account.',
        entityType: PublishEntityType.CAMPAIGN,
        entityId: campaign.id,
        field: 'adAccountId',
      });
    }

    if (campaign.adAccount?.platform !== PlatformType.TIKTOK) {
      issues.push({
        code: 'PLATFORM_MISMATCH',
        message: 'Campaign ad account is not a TikTok account.',
        entityType: PublishEntityType.CAMPAIGN,
        entityId: campaign.id,
      });
    }

    if (!TIKTOK_V1_OBJECTIVE_MAP[campaign.objective]) {
      issues.push({
        code: 'UNSUPPORTED_OBJECTIVE',
        message: `V1 TikTok publisher does not support objective ${campaign.objective}. Supported: ${Object.keys(TIKTOK_V1_OBJECTIVE_MAP).join(', ')}.`,
        entityType: PublishEntityType.CAMPAIGN,
        entityId: campaign.id,
        field: 'objective',
      });
    }

    const adAccount = await this.adAccountsService.findOne(
      request.adAccountId,
      currentUser,
    );

    if (adAccount.platform !== PlatformType.TIKTOK) {
      issues.push({
        code: 'AD_ACCOUNT_NOT_TIKTOK',
        message: 'Selected ad account is not a TikTok account.',
        field: 'adAccountId',
      });
    }

    if (!adAccount.isActive) {
      issues.push({
        code: 'AD_ACCOUNT_INACTIVE',
        message: 'Selected TikTok ad account is inactive.',
        field: 'adAccountId',
      });
    }

    const connection = await this.platformConnectionsService.findOne(
      adAccount.platformConnectionId,
      currentUser,
    );

    if (connection.platform !== PlatformType.TIKTOK) {
      issues.push({
        code: 'CONNECTION_NOT_TIKTOK',
        message: 'Platform connection is not a TikTok connection.',
        field: 'platformConnectionId',
      });
    }

    if (connection.status !== ConnectionStatus.ACTIVE) {
      issues.push({
        code: 'CONNECTION_INACTIVE',
        message: `TikTok platform connection is ${connection.status}. Expected ACTIVE.`,
        field: 'platformConnectionId',
      });
    }

    const identityId = this.resolveIdentityId(request, adAccount.metadata);
    if (!dryRun && !identityId) {
      issues.push({
        code: 'IDENTITY_ID_REQUIRED',
        message:
          'TikTok identityId is required for live publish. Pass options.identityId or set adAccount.metadata.identityId.',
        field: 'options.identityId',
      });
    }

    const displayName = this.resolveDisplayName(
      request,
      adAccount.metadata,
      adAccount.accountName,
    );

    // Access tokens are not exposed by PlatformConnectionsService DTOs.
    const credential = await this.prisma.platformCredential.findFirst({
      where: {
        platformConnectionId: adAccount.platformConnectionId,
        isActive: true,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!credential?.accessToken) {
      issues.push({
        code: 'TIKTOK_CREDENTIALS_MISSING',
        message:
          'No active TikTok access token found for this ad account connection.',
      });
    }

    const accessToken = credential
      ? this.safeDecrypt(credential.accessToken)
      : '';

    if (credential?.expiresAt && credential.expiresAt.getTime() < Date.now()) {
      issues.push({
        code: 'TIKTOK_TOKEN_EXPIRED',
        message: 'TikTok access token has expired. Reconnect the platform.',
      });
    }

    const adSetsPage = await this.adSetsService.findAll(
      {
        campaignId: campaign.id,
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      },
      currentUser,
    );

    let adSets = adSetsPage.data;
    if (request.entityIds?.adSetIds?.length) {
      const allowed = new Set(request.entityIds.adSetIds);
      adSets = adSets.filter((adSet) => allowed.has(adSet.id));
    }

    if (adSets.length === 0) {
      issues.push({
        code: 'NO_AD_SETS',
        message: 'Campaign has no ad sets to publish.',
        entityType: PublishEntityType.CAMPAIGN,
        entityId: campaign.id,
      });
    }

    for (const adSet of adSets) {
      const locationIds = this.resolveLocationIds(adSet);
      if (locationIds.length === 0) {
        issues.push({
          code: 'UNSUPPORTED_GEO',
          message:
            'Ad set targeting.countries has no mapped TikTok location_ids. Use a supported ISO country code (e.g. US, GB, CA).',
          entityType: PublishEntityType.AD_SET,
          entityId: adSet.id,
          field: 'targeting.countries',
        });
      }
    }

    const adsPages = await Promise.all(
      adSets.map((adSet) =>
        this.adsService.findAll(
          {
            adSetId: adSet.id,
            page: 1,
            limit: 100,
            sortBy: 'createdAt',
            sortOrder: 'asc',
          },
          currentUser,
        ),
      ),
    );

    let ads = adsPages.flatMap((page) => page.data);
    if (request.entityIds?.adIds?.length) {
      const allowed = new Set(request.entityIds.adIds);
      ads = ads.filter((ad) => allowed.has(ad.id));
    }

    if (ads.length === 0) {
      issues.push({
        code: 'NO_ADS',
        message: 'Campaign has no ads to publish.',
        entityType: PublishEntityType.CAMPAIGN,
        entityId: campaign.id,
      });
    }

    const creativeIds = [
      ...new Set(
        ads
          .map((ad) => ad.creativeId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const creatives = await Promise.all(
      creativeIds.map((id) =>
        this.creativesService.findOne(id, currentUser),
      ),
    );

    const creativesById = new Map(
      creatives.map((creative) => [creative.id, creative]),
    );

    const imageUrlByCreativeId = new Map<string, string>();
    const videoByCreativeId = new Map<string, ResolvedVideoMedia>();

    for (const creative of creatives) {
      if (creative.type === CreativeType.IMAGE) {
        const imageUrl = await this.resolveImageUrl(creative, currentUser);
        if (imageUrl) {
          imageUrlByCreativeId.set(creative.id, imageUrl);
        }
      }

      if (creative.type === CreativeType.VIDEO) {
        const video = await this.resolveVideoMedia(creative, currentUser);
        if (video) {
          videoByCreativeId.set(creative.id, video);
        }
      }
    }

    for (const ad of ads) {
      if (!ad.creativeId) {
        issues.push({
          code: 'AD_MISSING_CREATIVE',
          message: 'Ad has no linked creative.',
          entityType: PublishEntityType.AD,
          entityId: ad.id,
        });
        continue;
      }

      const creative = creativesById.get(ad.creativeId);
      if (!creative) {
        issues.push({
          code: 'CREATIVE_NOT_FOUND',
          message: 'Linked creative was not found.',
          entityType: PublishEntityType.AD,
          entityId: ad.id,
        });
        continue;
      }

      if (
        !TIKTOK_V1_SUPPORTED_CREATIVE_TYPES.includes(
          creative.type as (typeof TIKTOK_V1_SUPPORTED_CREATIVE_TYPES)[number],
        )
      ) {
        issues.push({
          code: 'UNSUPPORTED_CREATIVE_TYPE',
          message: `V1 TikTok publisher supports IMAGE (legacy) and VIDEO. Found ${creative.type}.`,
          entityType: PublishEntityType.CREATIVE,
          entityId: creative.id,
          field: 'type',
        });
      }

      if (!creative.headline?.trim() || !creative.primaryText?.trim()) {
        issues.push({
          code: 'MISSING_AI_COPY',
          message:
            'Creative is missing headline or primaryText. Run AI Copy generation first.',
          entityType: PublishEntityType.CREATIVE,
          entityId: creative.id,
        });
      }

      if (creative.type === CreativeType.IMAGE) {
        if (!imageUrlByCreativeId.get(creative.id)) {
          issues.push({
            code: 'MISSING_IMAGE',
            message:
              'IMAGE creative requires a CreativeAsset or metadata.sourceImageUrls / featuredImageUrl.',
            entityType: PublishEntityType.CREATIVE,
            entityId: creative.id,
          });
        }
      }

      if (creative.type === CreativeType.VIDEO) {
        const video = videoByCreativeId.get(creative.id);
        if (!video) {
          issues.push({
            code: 'MISSING_VIDEO',
            message:
              'VIDEO creative requires a CreativeAsset (VIDEO) or metadata.sourceVideoUrls / videoUrl with a reachable Storage URL.',
            entityType: PublishEntityType.CREATIVE,
            entityId: creative.id,
          });
        } else if (
          !TIKTOK_V1_SUPPORTED_VIDEO_MIME_TYPES.includes(
            video.mimeType as (typeof TIKTOK_V1_SUPPORTED_VIDEO_MIME_TYPES)[number],
          )
        ) {
          issues.push({
            code: 'UNSUPPORTED_VIDEO_FORMAT',
            message: `Unsupported video MIME type ${video.mimeType}. Supported: ${TIKTOK_V1_SUPPORTED_VIDEO_MIME_TYPES.join(', ')}.`,
            entityType: PublishEntityType.CREATIVE,
            entityId: creative.id,
            field: 'mimeType',
          });
        }
      }

      if (!creative.landingPageUrl) {
        issues.push({
          code: 'MISSING_LANDING_URL',
          message: 'Creative is missing landingPageUrl.',
          entityType: PublishEntityType.CREATIVE,
          entityId: creative.id,
          field: 'landingPageUrl',
        });
      }
    }

    return {
      campaign,
      advertiserId: adAccount.externalId,
      accessToken,
      identityId,
      displayName,
      dryRun,
      adSets,
      ads,
      creativesById,
      imageUrlByCreativeId,
      videoByCreativeId,
    };
  }

  private async publishCampaign(
    context: TikTokPublishContext,
    objectiveType: string,
  ): Promise<string> {
    if (context.dryRun) {
      return `tiktok_dry_campaign_${context.campaign.id}`;
    }

    const created = await this.tikTokApiClient.createCampaign(
      context.accessToken,
      {
        advertiser_id: context.advertiserId,
        campaign_name: context.campaign.name,
        objective_type: objectiveType,
        operation_status: TIKTOK_OPERATION_STATUS_PAUSED,
      },
    );

    return created.id;
  }

  private async publishAdSet(
    context: TikTokPublishContext,
    adSet: AdSetResponseDto,
    campaignExternalId: string,
    objectiveType: string,
  ): Promise<string> {
    if (context.dryRun) {
      return `tiktok_dry_adset_${adSet.id}`;
    }

    const locationIds = this.resolveLocationIds(adSet);
    const budget = this.toMajorBudget(
      adSet.dailyBudget ?? context.campaign.dailyBudget,
    );

    const scheduleStart = this.formatTikTokDateTime(new Date());
    const { billingEvent, optimizationGoal } =
      this.adGroupOptimizationFor(objectiveType);

    const created = await this.tikTokApiClient.createAdGroup(
      context.accessToken,
      {
        advertiser_id: context.advertiserId,
        campaign_id: campaignExternalId,
        adgroup_name: adSet.name,
        promotion_type: 'WEBSITE',
        placement_type: 'PLACEMENT_TYPE_AUTOMATIC',
        location_ids: locationIds,
        budget_mode: 'BUDGET_MODE_DAY',
        budget,
        schedule_type: 'SCHEDULE_FROM_NOW',
        schedule_start_time: scheduleStart,
        billing_event: billingEvent,
        optimization_goal: optimizationGoal,
        bid_type: 'BID_TYPE_NO_BID',
        pacing: 'PACING_MODE_SMOOTH',
        operation_status: TIKTOK_OPERATION_STATUS_PAUSED,
      },
    );

    return created.id;
  }

  /**
   * TikTok has no separate AdCreative entity like Meta.
   * - IMAGE (legacy): upload image → image_id
   * - VIDEO (primary): upload video → video_id
   */
  private async publishCreative(
    context: TikTokPublishContext,
    creative: CreativeResponseDto,
  ): Promise<string> {
    if (context.dryRun) {
      if (creative.type === CreativeType.VIDEO) {
        return `tiktok_dry_video_${creative.id}`;
      }
      return `tiktok_dry_creative_${creative.id}`;
    }

    if (creative.type === CreativeType.VIDEO) {
      const video = context.videoByCreativeId.get(creative.id);
      if (!video) {
        throw new Error(`Missing video URL for creative ${creative.id}.`);
      }

      const uploaded = await this.tikTokApiClient.uploadVideoByUrl(
        context.accessToken,
        context.advertiserId,
        video.url,
        creative.name,
      );

      return uploaded.id;
    }

    // Temporary IMAGE compatibility — do not expand this path.
    const imageUrl = context.imageUrlByCreativeId.get(creative.id);
    if (!imageUrl) {
      throw new Error(`Missing image URL for creative ${creative.id}.`);
    }

    const uploaded = await this.tikTokApiClient.uploadImageByUrl(
      context.accessToken,
      context.advertiserId,
      imageUrl,
      creative.name,
    );

    return uploaded.id;
  }

  private async publishAd(
    context: TikTokPublishContext,
    ad: AdResponseDto,
    adSetExternalId: string,
    creative: CreativeResponseDto,
    mediaExternalId: string,
  ): Promise<string> {
    if (context.dryRun) {
      return `tiktok_dry_ad_${ad.id}`;
    }

    const cta =
      TIKTOK_V1_CTA_MAP[creative.callToAction ?? CallToAction.SHOP_NOW] ??
      'SHOP_NOW';

    const creativePayload: Record<string, unknown> = {
      ad_name: ad.name,
      ad_text: creative.primaryText,
      landing_page_url: creative.landingPageUrl,
      call_to_action: cta,
      display_name: context.displayName || creative.headline,
      operation_status: TIKTOK_OPERATION_STATUS_PAUSED,
    };

    if (creative.type === CreativeType.VIDEO) {
      creativePayload.ad_format = 'SINGLE_VIDEO';
      creativePayload.video_id = mediaExternalId;

      const video = context.videoByCreativeId.get(creative.id);
      if (video?.thumbnailUrl) {
        // Optional cover when a thumbnail already exists (no generation).
        const cover = await this.tikTokApiClient.uploadImageByUrl(
          context.accessToken,
          context.advertiserId,
          video.thumbnailUrl,
          `${creative.name}-cover`,
        );
        creativePayload.image_ids = [cover.id];
      }
    } else {
      // Temporary legacy SINGLE_IMAGE compatibility.
      creativePayload.ad_format = 'SINGLE_IMAGE';
      creativePayload.image_ids = [mediaExternalId];
    }

    if (context.identityId) {
      creativePayload.identity_type = 'CUSTOMIZED_USER';
      creativePayload.identity_id = context.identityId;
    }

    const created = await this.tikTokApiClient.createAd(
      context.accessToken,
      {
        advertiser_id: context.advertiserId,
        adgroup_id: adSetExternalId,
        creatives: [creativePayload],
      },
    );

    return created.id;
  }

  private adGroupOptimizationFor(objectiveType: string): {
    billingEvent: string;
    optimizationGoal: string;
  } {
    switch (objectiveType) {
      case 'REACH':
        return { billingEvent: 'CPM', optimizationGoal: 'REACH' };
      case 'ENGAGEMENT':
        return { billingEvent: 'OCPM', optimizationGoal: 'ENGAGED_VIEW' };
      case 'LEAD_GENERATION':
        return { billingEvent: 'OCPM', optimizationGoal: 'LEAD_GENERATION' };
      case 'CONVERSIONS':
        return { billingEvent: 'OCPM', optimizationGoal: 'CONVERT' };
      case 'TRAFFIC':
      default:
        return { billingEvent: 'CPC', optimizationGoal: 'CLICK' };
    }
  }

  private resolveLocationIds(adSet: AdSetResponseDto): string[] {
    const targeting = (adSet.targeting ?? {}) as Record<string, unknown>;
    const countries = Array.isArray(targeting.countries)
      ? (targeting.countries as string[])
      : ['US'];

    const locationIds: string[] = [];
    for (const country of countries) {
      const code = String(country).trim().toUpperCase();
      const locationId = TIKTOK_V1_COUNTRY_LOCATION_IDS[code];
      if (locationId) {
        locationIds.push(locationId);
      }
    }

    return [...new Set(locationIds)];
  }

  private async resolveImageUrl(
    creative: CreativeResponseDto,
    currentUser: JwtPayload,
  ): Promise<string | null> {
    const assetsPage = await this.creativeAssetsService.findAll(
      {
        creativeId: creative.id,
        assetType: CreativeAssetType.IMAGE,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      currentUser,
    );

    const primary =
      assetsPage.data.find((asset) => asset.isPrimary) ?? assetsPage.data[0];

    if (primary?.url) {
      return primary.url;
    }

    const metadata = (creative.metadata ?? {}) as Record<string, unknown>;
    const sourceImageUrls = metadata.sourceImageUrls;

    if (
      Array.isArray(sourceImageUrls) &&
      typeof sourceImageUrls[0] === 'string'
    ) {
      return sourceImageUrls[0];
    }

    if (typeof metadata.featuredImageUrl === 'string') {
      return metadata.featuredImageUrl;
    }

    return null;
  }

  private async resolveVideoMedia(
    creative: CreativeResponseDto,
    currentUser: JwtPayload,
  ): Promise<ResolvedVideoMedia | null> {
    const assetsPage = await this.creativeAssetsService.findAll(
      {
        creativeId: creative.id,
        assetType: CreativeAssetType.VIDEO,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      currentUser,
    );

    const primary =
      assetsPage.data.find((asset) => asset.isPrimary) ?? assetsPage.data[0];

    if (primary) {
      const url = await this.resolveAssetReachableUrl(
        primary.url,
        primary.storageKey,
      );
      if (url) {
        return {
          url,
          mimeType: primary.mimeType || this.guessVideoMime(primary.extension),
          thumbnailUrl: primary.thumbnailUrl,
        };
      }
    }

    const metadata = (creative.metadata ?? {}) as Record<string, unknown>;
    const sourceVideoUrls = metadata.sourceVideoUrls;
    let videoUrl: string | null = null;

    if (
      Array.isArray(sourceVideoUrls) &&
      typeof sourceVideoUrls[0] === 'string'
    ) {
      videoUrl = sourceVideoUrls[0];
    } else if (typeof metadata.videoUrl === 'string') {
      videoUrl = metadata.videoUrl;
    }

    if (!videoUrl) {
      return null;
    }

    const thumbnailUrl =
      typeof metadata.thumbnailUrl === 'string'
        ? metadata.thumbnailUrl
        : typeof metadata.coverImageUrl === 'string'
          ? metadata.coverImageUrl
          : null;

    return {
      url: videoUrl,
      mimeType:
        typeof metadata.videoMimeType === 'string'
          ? metadata.videoMimeType
          : this.guessVideoMimeFromUrl(videoUrl),
      thumbnailUrl,
    };
  }

  private async resolveAssetReachableUrl(
    assetUrl: string | null | undefined,
    storageKey: string,
  ): Promise<string | null> {
    if (assetUrl?.trim()) {
      return assetUrl.trim();
    }

    try {
      const publicUrl = await this.storageService.getPublicUrl(storageKey);
      if (publicUrl?.trim()) {
        return publicUrl.trim();
      }
    } catch {
      // fall through
    }

    try {
      const signedUrl = await this.storageService.getSignedUrl(storageKey, {
        expiresIn: 60 * 60,
      });
      return signedUrl?.trim() || null;
    } catch {
      return null;
    }
  }

  private guessVideoMime(extension: string | null | undefined): string {
    const ext = (extension ?? '').toLowerCase().replace(/^\./, '');
    switch (ext) {
      case 'mov':
        return 'video/quicktime';
      case 'webm':
        return 'video/webm';
      case 'mp4':
      default:
        return 'video/mp4';
    }
  }

  private guessVideoMimeFromUrl(url: string): string {
    const path = url.split('?')[0] ?? url;
    const ext = path.includes('.') ? path.split('.').pop() : 'mp4';
    return this.guessVideoMime(ext);
  }

  private resolveIdentityId(
    request: PublishRequest,
    adAccountMetadata: unknown,
  ): string | null {
    const fromOptions = request.options?.identityId;
    if (typeof fromOptions === 'string' && fromOptions.trim()) {
      return fromOptions.trim();
    }

    const metadata = (adAccountMetadata ?? {}) as Record<string, unknown>;
    if (typeof metadata.identityId === 'string' && metadata.identityId.trim()) {
      return metadata.identityId.trim();
    }

    return null;
  }

  private resolveDisplayName(
    request: PublishRequest,
    adAccountMetadata: unknown,
    fallback: string,
  ): string {
    const fromOptions = request.options?.displayName;
    if (typeof fromOptions === 'string' && fromOptions.trim()) {
      return fromOptions.trim();
    }

    const metadata = (adAccountMetadata ?? {}) as Record<string, unknown>;
    if (
      typeof metadata.displayName === 'string' &&
      metadata.displayName.trim()
    ) {
      return metadata.displayName.trim();
    }

    return fallback;
  }

  private isDryRun(request: PublishRequest): boolean {
    return request.options?.dryRun === true;
  }

  private toMajorBudget(budget: string | number | null | undefined): number {
    if (budget === null || budget === undefined) {
      return 20;
    }

    const value = typeof budget === 'string' ? Number(budget) : budget;
    if (!Number.isFinite(value) || value <= 0) {
      return 20;
    }

    return Math.round(value * 100) / 100;
  }

  private formatTikTokDateTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  }

  private safeDecrypt(token: string): string {
    try {
      return this.encryptionService.decrypt(token);
    } catch {
      return token;
    }
  }

  private toSystemUser(request: PublishRequest): JwtPayload {
    return {
      sub: request.requestedByUserId ?? 'publisher',
      email: 'publisher@system.local',
      organizationId: request.organizationId,
      role: MembershipRole.ADMIN,
    };
  }

  private async failJob(
    jobId: string,
    issues: PublishValidationIssue[],
    startedAt: Date,
    errorMessage?: string,
    status: PublishJobStatus = PublishJobStatus.FAILED,
    entities?: PublishEntityResult[],
  ): Promise<void> {
    await this.prisma.publishJob.update({
      where: { id: jobId },
      data: {
        status,
        errorMessage:
          errorMessage ??
          issues.map((issue) => issue.message).join(' | ').slice(0, 2000),
        result: {
          issues,
          entities: entities ?? [],
        } as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
        startedAt,
      },
    });
  }

  private toResult(params: {
    success: boolean;
    status: PublishStatus;
    campaignId: string;
    externalCampaignId?: string;
    entities: PublishEntityResult[];
    issues: PublishValidationIssue[];
    startedAt: Date;
    completedAt?: Date;
    raw?: unknown;
  }): PublishResult {
    const completedAt = params.completedAt ?? new Date();

    return {
      success: params.success,
      platform: this.platform,
      status: params.status,
      campaignId: params.campaignId,
      externalCampaignId: params.externalCampaignId,
      entities: params.entities,
      issues: params.issues,
      startedAt: params.startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - params.startedAt.getTime(),
      raw: params.raw,
    };
  }
}
