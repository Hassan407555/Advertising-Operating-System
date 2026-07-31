import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  CampaignObjective,
  CallToAction,
  CreativeAssetType,
  CreativeType,
  MembershipRole,
  PlatformType,
  Prisma,
  PublishJobStatus,
} from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../infrastructure/encryption/encryption.service';
import { StorageService } from '../../../storage/services/storage.service';
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
import type { PublishDiagnostics } from '../../types/publish-diagnostics.types';
import {
  META_V1_CTA_MAP,
  META_V1_OBJECTIVE_MAP,
  META_V1_SUPPORTED_CREATIVE_TYPES,
  META_V1_SUPPORTED_VIDEO_MIME_TYPES,
} from './meta.constants';
import { PublisherValidationError } from '../../errors/publisher-validation.error';
import { MetaGraphClient } from './meta-graph.client';
import {
  extractMetaGraphError,
  formatMetaErrorMessage,
} from './meta-graph.error';
import { PublishStageTracker } from './publish-stage-tracker';
import { MetaCreativePublishStrategyFactory } from './strategies/creative-publish.strategy.factory';
import type {
  MetaCreativePublishContext,
  ResolvedVideoMedia,
} from './strategies/creative-publish.strategy';

interface MetaPublishContext {
  campaign: CampaignResponseDto;
  adAccountExternalId: string;
  accessToken: string;
  pageId: string | null;
  dryRun: boolean;
  adSets: AdSetResponseDto[];
  ads: AdResponseDto[];
  creativesById: Map<string, CreativeResponseDto>;
  /** creativeId → resolved VIDEO media (Creative Assets / Storage / metadata) */
  videoByCreativeId: Map<string, ResolvedVideoMedia>;
  /** Stage timing + Meta error collector (diagnostics only). */
  stageTracker: PublishStageTracker;
}

/**
 * Meta Marketing API publisher — V1 scope only:
 * - Standard campaign objectives (mapped to OUTCOME_*)
 * - Single-image (or text) ads
 * - Single-video ads (upload existing video asset)
 * - NONE creatives (existing creative/post or link-only, no media upload)
 * - Existing AI-generated copy fields
 * - Existing campaign → ad set → ad → creative structure
 * - Publish only (campaigns created as PAUSED)
 */
@Injectable()
export class MetaPublisherProvider
  implements PublisherProvider, OnModuleInit
{
  readonly platform = PublisherPlatform.META;

  private readonly logger = new Logger(MetaPublisherProvider.name);
  private readonly creativeStrategies = new MetaCreativePublishStrategyFactory();

  constructor(
    private readonly registry: PublisherRegistry,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly storageService: StorageService,
    private readonly campaignsService: CampaignsService,
    private readonly adAccountsService: AdAccountsService,
    private readonly adSetsService: AdSetsService,
    private readonly adsService: AdsService,
    private readonly creativesService: CreativesService,
    private readonly creativeAssetsService: CreativeAssetsService,
    private readonly metaGraphClient: MetaGraphClient,
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
      if (error instanceof PublisherValidationError) {
        throw error;
      }
      issues.push({
        code: 'META_CONTEXT_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to build Meta publish context.',
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
    this.logger.log({
      msg: 'meta.publish.started',
      campaignId: request.campaignId,
      organizationId: request.organizationId,
      adAccountId: request.adAccountId,
      dryRun,
      metaTestMode: process.env.META_TEST_MODE ?? null,
      pageId: request.options?.pageId ?? null,
    });
    const issues: PublishValidationIssue[] = [];
    const entities: PublishEntityResult[] = [];
    const stageTracker = new PublishStageTracker(MetaPublisherProvider.name);
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
        platform: PlatformType.META,
        status: PublishJobStatus.VALIDATING,
        dryRun,
        requestedByUserId: request.requestedByUserId,
        request: request as unknown as Prisma.InputJsonValue,
        startedAt,
      },
    });

    try {
      const context = await this.buildContext(
        request,
        issues,
        dryRun,
        stageTracker,
      );

      if (issues.length > 0) {
        const diagnostics = stageTracker.buildDiagnostics({
          success: false,
          fallbackMessage: issues.map((issue) => issue.message).join(' | '),
        });
        await this.failJob(
          job.id,
          issues,
          startedAt,
          diagnostics.errorMessage,
          PublishJobStatus.FAILED,
          entities,
          diagnostics,
        );
        return this.toResult({
          success: false,
          status: PublishStatus.FAILED,
          campaignId: request.campaignId,
          entities,
          issues,
          startedAt,
          diagnostics,
        });
      }

      await this.prisma.publishJob.update({
        where: { id: job.id },
        data: { status: PublishJobStatus.PUBLISHING },
      });

      const metaObjective =
        META_V1_OBJECTIVE_MAP[context.campaign.objective];

      const campaignExternalId = await this.publishCampaign(
        context,
        metaObjective,
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
            externalStatus: 'PAUSED',
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
              externalStatus: 'PAUSED',
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
                externalStatus: 'PAUSED',
                lastSuccessfulSyncAt: new Date(),
                lastSyncedAt: new Date(),
              },
            });
          }
        }
      }

      await stageTracker.run(
        'publish_complete',
        {
          entityType: PublishEntityType.CAMPAIGN,
          entityId: context.campaign.id,
          message: 'Flushing local external IDs',
        },
        async () => {
          await flushLocalWrites();
        },
      );

      const completedAt = new Date();
      const diagnostics = stageTracker.buildDiagnostics({ success: true });
      const result = this.toResult({
        success: true,
        status: PublishStatus.PUBLISHED,
        campaignId: request.campaignId,
        externalCampaignId: campaignExternalId,
        entities,
        issues,
        startedAt,
        completedAt,
        diagnostics,
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
      // Business validation errors must surface as PublisherValidationError,
      // not as soft Graph diagnostics with raw Meta messaging.
      if (error instanceof PublisherValidationError) {
        throw error;
      }

      const metaError = extractMetaGraphError(error);
      const diagnostics = stageTracker.buildDiagnostics({
        success: false,
        error,
        fallbackMessage: 'Meta publish failed.',
      });
      const message =
        diagnostics.errorMessage ??
        (metaError
          ? formatMetaErrorMessage(metaError)
          : error instanceof Error
            ? error.message
            : 'Meta publish failed.');

      this.logger.error(
        `Meta publish failed: ${message}` +
          (metaError
            ? ` httpStatus=${metaError.httpStatus} code=${metaError.code ?? 'n/a'} fbtrace_id=${metaError.fbtraceId ?? 'n/a'} raw=${JSON.stringify(metaError.raw ?? null)}`
            : ''),
      );

      issues.push({
        code: diagnostics.errorCode ?? 'META_PUBLISH_FAILED',
        message,
        entityType: diagnostics.stages.find((s) => s.status === 'failed')
          ?.entityType,
        entityId: diagnostics.stages.find((s) => s.status === 'failed')
          ?.entityId,
        field: diagnostics.stage,
      });

      // Ensure diagnostics always carries the original Graph identity even when
      // the failed stage list is empty (should not happen for Graph calls).
      if (!diagnostics.errorMessage && message) {
        diagnostics.errorMessage = message;
      }
      if (metaError) {
        diagnostics.httpStatus = diagnostics.httpStatus ?? metaError.httpStatus;
        diagnostics.graphErrorCode =
          diagnostics.graphErrorCode ?? metaError.code;
        diagnostics.graphErrorSubcode =
          diagnostics.graphErrorSubcode ?? metaError.errorSubcode;
        diagnostics.metaTraceId =
          diagnostics.metaTraceId ?? metaError.fbtraceId;
      }

      this.logger.error(
        `Meta publish soft-fail diagnostics=${JSON.stringify({
          stage: diagnostics.stage,
          errorCode: diagnostics.errorCode,
          errorMessage: diagnostics.errorMessage,
          httpStatus: diagnostics.httpStatus,
          graphErrorCode: diagnostics.graphErrorCode,
          metaTraceId: diagnostics.metaTraceId,
          stageCount: diagnostics.stages.length,
        })}`,
      );

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
        diagnostics,
      );

      return this.toResult({
        success: false,
        status: terminalStatus,
        campaignId: request.campaignId,
        entities,
        issues,
        startedAt,
        diagnostics,
      });
    }
  }

  private async buildContext(
    request: PublishRequest,
    issues: PublishValidationIssue[],
    dryRun: boolean,
    stageTracker: PublishStageTracker = new PublishStageTracker(
      MetaPublisherProvider.name,
    ),
  ): Promise<MetaPublishContext> {
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

    if (campaign.adAccount?.platform !== PlatformType.META) {
      issues.push({
        code: 'PLATFORM_MISMATCH',
        message: 'Campaign ad account is not a Meta account.',
        entityType: PublishEntityType.CAMPAIGN,
        entityId: campaign.id,
      });
    }

    if (!META_V1_OBJECTIVE_MAP[campaign.objective]) {
      issues.push({
        code: 'UNSUPPORTED_OBJECTIVE',
        message: `V1 Meta publisher does not support objective ${campaign.objective}. Supported: ${Object.keys(META_V1_OBJECTIVE_MAP).join(', ')}.`,
        entityType: PublishEntityType.CAMPAIGN,
        entityId: campaign.id,
        field: 'objective',
      });
    }

    const adAccount = await this.adAccountsService.findOne(
      request.adAccountId,
      currentUser,
    );

    if (adAccount.platform !== PlatformType.META) {
      issues.push({
        code: 'AD_ACCOUNT_NOT_META',
        message: 'Selected ad account is not a Meta account.',
        field: 'adAccountId',
      });
    }

    if (!adAccount.isActive) {
      issues.push({
        code: 'AD_ACCOUNT_INACTIVE',
        message: 'Selected Meta ad account is inactive.',
        field: 'adAccountId',
      });
    }

    const pageId = this.resolvePageId(request, adAccount.metadata);
    if (!dryRun && !pageId) {
      issues.push({
        code: 'PAGE_ID_REQUIRED',
        message:
          'Meta pageId is required for live publish. Pass options.pageId or set adAccount.metadata.pageId.',
        field: 'options.pageId',
      });
    }

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
        code: 'META_CREDENTIALS_MISSING',
        message: 'No active Meta access token found for this ad account connection.',
      });
    }

    const accessToken = credential
      ? this.safeDecrypt(credential.accessToken)
      : '';

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

    if (request.entityIds?.creativeIds?.length) {
      const allowed = new Set(request.entityIds.creativeIds);
      for (const id of creativeIds) {
        if (!allowed.has(id)) {
          // filtered later via ads without those creatives — skip
        }
      }
    }

    const creatives = await Promise.all(
      creativeIds.map((id) =>
        this.creativesService.findOne(id, currentUser),
      ),
    );

    const creativesById = new Map(
      creatives.map((creative) => [creative.id, creative]),
    );

    const videoByCreativeId = new Map<string, ResolvedVideoMedia>();
    for (const creative of creatives) {
      if (creative.type !== CreativeType.VIDEO) {
        continue;
      }
      const video = await this.resolveVideoMedia(creative, currentUser);
      if (video) {
        videoByCreativeId.set(creative.id, video);
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
        !META_V1_SUPPORTED_CREATIVE_TYPES.includes(
          creative.type as (typeof META_V1_SUPPORTED_CREATIVE_TYPES)[number],
        )
      ) {
        issues.push({
          code: 'UNSUPPORTED_CREATIVE_TYPE',
          message: `V1 Meta publisher only supports IMAGE/TEXT/VIDEO/NONE creatives. Found ${creative.type}.`,
          entityType: PublishEntityType.CREATIVE,
          entityId: creative.id,
          field: 'type',
        });
        continue;
      }

      const strategy = this.creativeStrategies.get(creative.type);
      if (!strategy) {
        issues.push({
          code: 'UNSUPPORTED_CREATIVE_TYPE',
          message: `No publish strategy registered for creative type ${creative.type}.`,
          entityType: PublishEntityType.CREATIVE,
          entityId: creative.id,
          field: 'type',
        });
        continue;
      }

      const strategyContext = this.buildCreativeStrategyContext({
        adAccountExternalId: adAccount.externalId,
        accessToken,
        pageId,
        dryRun,
        videoByCreativeId,
        stageTracker,
      });

      issues.push(...strategy.validate(creative, strategyContext, ad.id));
    }

    return {
      campaign,
      adAccountExternalId: adAccount.externalId,
      accessToken,
      pageId,
      dryRun,
      adSets,
      ads,
      creativesById,
      videoByCreativeId,
      stageTracker,
    };
  }

  private async publishCampaign(
    context: MetaPublishContext,
    metaObjective: string,
  ): Promise<string> {
    return context.stageTracker.run(
      'campaign',
      {
        entityType: PublishEntityType.CAMPAIGN,
        entityId: context.campaign.id,
      },
      async () => {
        if (context.dryRun) {
          return `meta_dry_campaign_${context.campaign.id}`;
        }

        const payload = this.buildMetaCampaignCreatePayload(
          context,
          metaObjective,
        );

        const created = await this.metaGraphClient.createCampaign(
          context.adAccountExternalId,
          context.accessToken,
          payload,
        );

        return created.id;
      },
    );
  }

  /**
   * Build Meta campaign create payload.
   *
   * Budget ownership must stay aligned with publishAdSet:
   * - Ad set budget mode → daily_budget is set on each ad set
   *   (adSet.dailyBudget ?? campaign.dailyBudget); campaign create must NOT
   *   send campaign budget, and must set is_adset_budget_sharing_enabled.
   * - Campaign budget (CBO) mode → daily_budget / lifetime_budget on the
   *   campaign; Meta does not require is_adset_budget_sharing_enabled.
   */
  private buildMetaCampaignCreatePayload(
    context: MetaPublishContext,
    metaObjective: string,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      name: context.campaign.name,
      objective: metaObjective,
      status: 'PAUSED',
      special_ad_categories: [],
    };

    const budgetMode = this.resolveMetaBudgetMode(context);

    if (budgetMode === 'campaign') {
      const dailyBudgetCents = this.toCentsOrNull(
        context.campaign.dailyBudget,
      );
      const lifetimeBudgetCents = this.toCentsOrNull(
        context.campaign.lifetimeBudget,
      );

      if (dailyBudgetCents != null) {
        payload.daily_budget = dailyBudgetCents;
      } else if (lifetimeBudgetCents != null) {
        payload.lifetime_budget = lifetimeBudgetCents;
      }
    } else {
      // Required by Meta when not using campaign budget (ad set budgets).
      // Keep ad set budget sharing optimization off unless our model enables it.
      payload.is_adset_budget_sharing_enabled = false;
    }

    return payload;
  }

  /**
   * Decide Meta budget ownership from our campaign/ad-set model.
   * Must match where publishAdSet places daily_budget.
   */
  private resolveMetaBudgetMode(
    context: MetaPublishContext,
  ): 'campaign' | 'ad_set' {
    // publishAdSet always sends daily_budget on each ad set using
    // adSet.dailyBudget ?? campaign.dailyBudget. That is Meta ad-set budget
    // mode (CBO off), even when the only configured amount lives on the
    // campaign row as a fallback.
    //
    // Return 'campaign' only if/when publishCampaign starts sending
    // daily_budget or lifetime_budget on the campaign and publishAdSet stops
    // sending ad-set budgets.
    const publishesBudgetOnAdSets = context.adSets.length > 0;
    if (publishesBudgetOnAdSets) {
      return 'ad_set';
    }

    const campaignHasBudget =
      this.hasPositiveBudget(context.campaign.dailyBudget) ||
      this.hasPositiveBudget(context.campaign.lifetimeBudget);

    return campaignHasBudget ? 'campaign' : 'ad_set';
  }

  private hasPositiveBudget(
    budget: string | number | null | undefined,
  ): boolean {
    if (budget === null || budget === undefined) {
      return false;
    }

    const value = typeof budget === 'string' ? Number(budget) : budget;
    return Number.isFinite(value) && value > 0;
  }

  private toCentsOrNull(
    budget: string | number | null | undefined,
  ): number | null {
    if (!this.hasPositiveBudget(budget)) {
      return null;
    }

    return this.toCents(budget);
  }

  private async publishAdSet(
    context: MetaPublishContext,
    adSet: AdSetResponseDto,
    campaignExternalId: string,
  ): Promise<string> {
    return context.stageTracker.run(
      'ad_set',
      {
        entityType: PublishEntityType.AD_SET,
        entityId: adSet.id,
      },
      async () => {
        if (context.dryRun) {
          return `meta_dry_adset_${adSet.id}`;
        }

        const targeting = (adSet.targeting ?? {}) as Record<string, unknown>;
        const countries = Array.isArray(targeting.countries)
          ? (targeting.countries as string[])
          : ['US'];

        const dailyBudgetCents = this.toCents(
          adSet.dailyBudget ?? context.campaign.dailyBudget,
        );

        const created = await this.metaGraphClient.createAdSet(
          context.adAccountExternalId,
          context.accessToken,
          {
            name: adSet.name,
            campaign_id: campaignExternalId,
            daily_budget: dailyBudgetCents,
            billing_event: 'IMPRESSIONS',
            optimization_goal: this.optimizationGoalFor(
              context.campaign.objective,
            ),
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
            targeting: {
              geo_locations: {
                countries,
              },
            },
            status: 'PAUSED',
          },
        );

        return created.id;
      },
    );
  }

  private async publishCreative(
    context: MetaPublishContext,
    creative: CreativeResponseDto,
  ): Promise<string> {
    const strategy = this.creativeStrategies.get(creative.type);
    if (!strategy) {
      throw new Error(
        `No Meta publish strategy for creative type ${creative.type}.`,
      );
    }

    return strategy.publish(
      creative,
      this.buildCreativeStrategyContext(context),
    );
  }

  private buildCreativeStrategyContext(
    context: Pick<
      MetaPublishContext,
      | 'adAccountExternalId'
      | 'accessToken'
      | 'pageId'
      | 'dryRun'
      | 'videoByCreativeId'
      | 'stageTracker'
    >,
  ): MetaCreativePublishContext {
    return {
      adAccountExternalId: context.adAccountExternalId,
      accessToken: context.accessToken,
      pageId: context.pageId,
      dryRun: context.dryRun,
      videoByCreativeId: context.videoByCreativeId,
      stageTracker: context.stageTracker,
      metaGraphClient: this.metaGraphClient,
      resolveImageUrl: (creative) => this.resolveImageUrl(creative),
      ctaMap: META_V1_CTA_MAP,
      defaultCta: CallToAction.SHOP_NOW,
      supportedVideoMimeTypes: META_V1_SUPPORTED_VIDEO_MIME_TYPES,
    };
  }

  private async publishAd(
    context: MetaPublishContext,
    ad: AdResponseDto,
    adSetExternalId: string,
    creativeExternalId: string,
  ): Promise<string> {
    return context.stageTracker.run(
      'ad',
      {
        entityType: PublishEntityType.AD,
        entityId: ad.id,
      },
      async () => {
        if (context.dryRun) {
          return `meta_dry_ad_${ad.id}`;
        }

        const created = await this.metaGraphClient.createAd(
          context.adAccountExternalId,
          context.accessToken,
          {
            name: ad.name,
            adset_id: adSetExternalId,
            creative: { creative_id: creativeExternalId },
            status: 'PAUSED',
          },
        );

        return created.id;
      },
    );
  }

  private optimizationGoalFor(objective: CampaignObjective): string {
    switch (objective) {
      case CampaignObjective.TRAFFIC:
        return 'LINK_CLICKS';
      case CampaignObjective.AWARENESS:
        return 'REACH';
      case CampaignObjective.ENGAGEMENT:
        return 'POST_ENGAGEMENT';
      case CampaignObjective.LEADS:
        return 'LEAD_GENERATION';
      case CampaignObjective.SALES:
      default:
        return 'OFFSITE_CONVERSIONS';
    }
  }

  private resolveImageUrl(creative: CreativeResponseDto): string | null {
    const metadata = (creative.metadata ?? {}) as Record<string, unknown>;
    const sourceImageUrls = metadata.sourceImageUrls;

    if (Array.isArray(sourceImageUrls) && typeof sourceImageUrls[0] === 'string') {
      return sourceImageUrls[0];
    }

    if (typeof metadata.featuredImageUrl === 'string') {
      return metadata.featuredImageUrl;
    }

    return null;
  }

  /**
   * Resolve VIDEO media from Creative Assets + Storage, then metadata fallbacks.
   */
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
      const url = await this.resolveAssetReachableUrl(primary.url, primary.storageKey);
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

    if (Array.isArray(sourceVideoUrls) && typeof sourceVideoUrls[0] === 'string') {
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
      // fall through to signed URL
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

  private resolvePageId(
    request: PublishRequest,
    adAccountMetadata: unknown,
  ): string | null {
    const fromOptions = request.options?.pageId;
    if (typeof fromOptions === 'string' && fromOptions.trim()) {
      return fromOptions.trim();
    }

    const metadata = (adAccountMetadata ?? {}) as Record<string, unknown>;
    if (typeof metadata.pageId === 'string' && metadata.pageId.trim()) {
      return metadata.pageId.trim();
    }

    return null;
  }

  private isDryRun(request: PublishRequest): boolean {
    return request.options?.dryRun === true;
  }

  private toCents(budget: string | number | null | undefined): number {
    if (budget === null || budget === undefined) {
      return 500;
    }

    const value = typeof budget === 'string' ? Number(budget) : budget;
    if (!Number.isFinite(value) || value <= 0) {
      return 500;
    }

    return Math.round(value * 100);
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
    diagnostics?: PublishDiagnostics,
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
          diagnostics: diagnostics ?? null,
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
    diagnostics?: PublishDiagnostics;
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
      diagnostics: params.diagnostics,
      raw: params.raw,
    };
  }
}
