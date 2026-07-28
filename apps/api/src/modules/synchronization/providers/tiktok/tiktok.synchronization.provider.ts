import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PlatformType } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../infrastructure/encryption/encryption.service';
import {
  SyncEntityType,
  SynchronizationPlatform,
} from '../../enums/synchronization.enums';
import { isLocalExternalId } from '../../utils/sync-external-id.util';
import { mapTikTokStatus } from '../../utils/sync-status.util';
import { SynchronizationRegistryService } from '../../services/synchronization-registry.service';
import type {
  SyncEntityState,
  SyncIssue,
  SyncMetricsSnapshot,
  SyncRequest,
  SynchronizationProvider,
} from '../interfaces/synchronization-provider.interface';
import {
  TikTokSyncClient,
  type TikTokSyncEntity,
  type TikTokSyncMetrics,
} from './tiktok-sync.client';

@Injectable()
export class TikTokSynchronizationProvider
  implements SynchronizationProvider, OnModuleInit
{
  readonly platform = SynchronizationPlatform.TIKTOK;

  private readonly logger = new Logger(TikTokSynchronizationProvider.name);

  constructor(
    private readonly registry: SynchronizationRegistryService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly tikTokSyncClient: TikTokSyncClient,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async syncCampaign(request: SyncRequest): Promise<{
    states: SyncEntityState[];
    issues: SyncIssue[];
    raw?: unknown;
  }> {
    const issues: SyncIssue[] = [];
    const states: SyncEntityState[] = [];

    if (!request.campaignId) {
      issues.push({
        code: 'CAMPAIGN_ID_REQUIRED',
        message: 'campaignId is required for campaign sync.',
      });
      return { states, issues };
    }

    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: request.campaignId,
        organizationId: request.organizationId,
        deletedAt: null,
      },
      include: {
        adAccount: true,
        adSets: {
          where: { deletedAt: null },
          include: {
            ads: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!campaign) {
      issues.push({
        code: 'CAMPAIGN_NOT_FOUND',
        message: 'Campaign not found for organization.',
        entityType: SyncEntityType.CAMPAIGN,
        entityId: request.campaignId,
      });
      return { states, issues };
    }

    if (campaign.adAccount.platform !== PlatformType.TIKTOK) {
      issues.push({
        code: 'PLATFORM_MISMATCH',
        message: 'Campaign ad account is not TikTok.',
        entityType: SyncEntityType.CAMPAIGN,
        entityId: campaign.id,
      });
      return { states, issues };
    }

    const accessToken = await this.resolveAccessToken(
      campaign.adAccount.platformConnectionId,
      issues,
    );
    if (!accessToken) {
      return { states, issues };
    }

    const advertiserId = campaign.adAccount.externalId;
    const { startDate, endDate } = this.last30DayRange();

    // Campaign
    if (isLocalExternalId(campaign.externalId)) {
      issues.push({
        code: 'NOT_PUBLISHED',
        message: 'Campaign has no live platform external ID; skip remote sync.',
        entityType: SyncEntityType.CAMPAIGN,
        entityId: campaign.id,
      });
    } else {
      const remoteCampaigns = await this.tikTokSyncClient.getCampaigns(
        accessToken,
        advertiserId,
        [campaign.externalId],
      );
      const metricsMap = await this.safeReport(
        accessToken,
        advertiserId,
        'AUCTION_CAMPAIGN',
        [campaign.externalId],
        startDate,
        endDate,
        issues,
      );
      states.push(
        this.toState({
          entityType: SyncEntityType.CAMPAIGN,
          entityId: campaign.id,
          externalId: campaign.externalId,
          remote: remoteCampaigns[0],
          metrics: metricsMap.get(campaign.externalId),
        }),
      );
    }

    // Ad sets
    const adSetExternalIds = campaign.adSets
      .map((adSet) => adSet.externalId)
      .filter((id) => !isLocalExternalId(id));

    const remoteAdGroups =
      adSetExternalIds.length > 0
        ? await this.tikTokSyncClient.getAdGroups(
            accessToken,
            advertiserId,
            adSetExternalIds,
          )
        : [];
    const adGroupById = new Map(
      remoteAdGroups.map((item) => [String(item.adgroup_id), item]),
    );
    const adSetMetrics =
      adSetExternalIds.length > 0
        ? await this.safeReport(
            accessToken,
            advertiserId,
            'AUCTION_ADGROUP',
            adSetExternalIds,
            startDate,
            endDate,
            issues,
          )
        : new Map<string, TikTokSyncMetrics>();

    for (const adSet of campaign.adSets) {
      if (isLocalExternalId(adSet.externalId)) {
        issues.push({
          code: 'NOT_PUBLISHED',
          message: 'Ad set has no live platform external ID; skip remote sync.',
          entityType: SyncEntityType.AD_SET,
          entityId: adSet.id,
        });
        continue;
      }

      states.push(
        this.toState({
          entityType: SyncEntityType.AD_SET,
          entityId: adSet.id,
          externalId: adSet.externalId,
          remote: adGroupById.get(adSet.externalId),
          metrics: adSetMetrics.get(adSet.externalId),
        }),
      );
    }

    // Ads
    const allAds = campaign.adSets.flatMap((adSet) => adSet.ads);
    const adExternalIds = allAds
      .map((ad) => ad.externalId)
      .filter((id) => !isLocalExternalId(id));

    const remoteAds =
      adExternalIds.length > 0
        ? await this.tikTokSyncClient.getAds(
            accessToken,
            advertiserId,
            adExternalIds,
          )
        : [];
    const adById = new Map(
      remoteAds.map((item) => [String(item.ad_id), item]),
    );
    const adMetrics =
      adExternalIds.length > 0
        ? await this.safeReport(
            accessToken,
            advertiserId,
            'AUCTION_AD',
            adExternalIds,
            startDate,
            endDate,
            issues,
          )
        : new Map<string, TikTokSyncMetrics>();

    for (const ad of allAds) {
      if (isLocalExternalId(ad.externalId)) {
        issues.push({
          code: 'NOT_PUBLISHED',
          message: 'Ad has no live platform external ID; skip remote sync.',
          entityType: SyncEntityType.AD,
          entityId: ad.id,
        });
        continue;
      }

      states.push(
        this.toState({
          entityType: SyncEntityType.AD,
          entityId: ad.id,
          externalId: ad.externalId,
          remote: adById.get(ad.externalId),
          metrics: adMetrics.get(ad.externalId),
        }),
      );
    }

    return { states, issues, raw: { platform: 'TIKTOK', scope: 'campaign' } };
  }

  async syncAdSet(request: SyncRequest): Promise<{
    states: SyncEntityState[];
    issues: SyncIssue[];
    raw?: unknown;
  }> {
    const issues: SyncIssue[] = [];
    const states: SyncEntityState[] = [];

    if (!request.adSetId) {
      issues.push({
        code: 'AD_SET_ID_REQUIRED',
        message: 'adSetId is required for ad set sync.',
      });
      return { states, issues };
    }

    const adSet = await this.prisma.adSet.findFirst({
      where: {
        id: request.adSetId,
        organizationId: request.organizationId,
        deletedAt: null,
      },
      include: {
        campaign: { include: { adAccount: true } },
        ads: { where: { deletedAt: null } },
      },
    });

    if (!adSet) {
      issues.push({
        code: 'AD_SET_NOT_FOUND',
        message: 'Ad set not found.',
        entityType: SyncEntityType.AD_SET,
        entityId: request.adSetId,
      });
      return { states, issues };
    }

    if (adSet.campaign.adAccount.platform !== PlatformType.TIKTOK) {
      issues.push({
        code: 'PLATFORM_MISMATCH',
        message: 'Ad set campaign is not on TikTok.',
      });
      return { states, issues };
    }

    const accessToken = await this.resolveAccessToken(
      adSet.campaign.adAccount.platformConnectionId,
      issues,
    );
    if (!accessToken) {
      return { states, issues };
    }

    const advertiserId = adSet.campaign.adAccount.externalId;
    const { startDate, endDate } = this.last30DayRange();

    if (!isLocalExternalId(adSet.externalId)) {
      const remote = await this.tikTokSyncClient.getAdGroups(
        accessToken,
        advertiserId,
        [adSet.externalId],
      );
      const metrics = await this.safeReport(
        accessToken,
        advertiserId,
        'AUCTION_ADGROUP',
        [adSet.externalId],
        startDate,
        endDate,
        issues,
      );
      states.push(
        this.toState({
          entityType: SyncEntityType.AD_SET,
          entityId: adSet.id,
          externalId: adSet.externalId,
          remote: remote[0],
          metrics: metrics.get(adSet.externalId),
        }),
      );
    }

    const adExternalIds = adSet.ads
      .map((ad) => ad.externalId)
      .filter((id) => !isLocalExternalId(id));

    if (adExternalIds.length > 0) {
      const remoteAds = await this.tikTokSyncClient.getAds(
        accessToken,
        advertiserId,
        adExternalIds,
      );
      const adById = new Map(
        remoteAds.map((item) => [String(item.ad_id), item]),
      );
      const adMetrics = await this.safeReport(
        accessToken,
        advertiserId,
        'AUCTION_AD',
        adExternalIds,
        startDate,
        endDate,
        issues,
      );

      for (const ad of adSet.ads) {
        if (isLocalExternalId(ad.externalId)) continue;
        states.push(
          this.toState({
            entityType: SyncEntityType.AD,
            entityId: ad.id,
            externalId: ad.externalId,
            remote: adById.get(ad.externalId),
            metrics: adMetrics.get(ad.externalId),
          }),
        );
      }
    }

    return { states, issues };
  }

  async syncAd(request: SyncRequest): Promise<{
    states: SyncEntityState[];
    issues: SyncIssue[];
    raw?: unknown;
  }> {
    const issues: SyncIssue[] = [];
    const states: SyncEntityState[] = [];

    if (!request.adId) {
      issues.push({
        code: 'AD_ID_REQUIRED',
        message: 'adId is required for ad sync.',
      });
      return { states, issues };
    }

    const ad = await this.prisma.ad.findFirst({
      where: {
        id: request.adId,
        organizationId: request.organizationId,
        deletedAt: null,
      },
      include: {
        adSet: {
          include: {
            campaign: { include: { adAccount: true } },
          },
        },
      },
    });

    if (!ad) {
      issues.push({
        code: 'AD_NOT_FOUND',
        message: 'Ad not found.',
        entityType: SyncEntityType.AD,
        entityId: request.adId,
      });
      return { states, issues };
    }

    if (ad.adSet.campaign.adAccount.platform !== PlatformType.TIKTOK) {
      issues.push({
        code: 'PLATFORM_MISMATCH',
        message: 'Ad is not on TikTok.',
      });
      return { states, issues };
    }

    if (isLocalExternalId(ad.externalId)) {
      issues.push({
        code: 'NOT_PUBLISHED',
        message: 'Ad has no live platform external ID; skip remote sync.',
        entityType: SyncEntityType.AD,
        entityId: ad.id,
      });
      return { states, issues };
    }

    const accessToken = await this.resolveAccessToken(
      ad.adSet.campaign.adAccount.platformConnectionId,
      issues,
    );
    if (!accessToken) {
      return { states, issues };
    }

    const advertiserId = ad.adSet.campaign.adAccount.externalId;
    const { startDate, endDate } = this.last30DayRange();

    const remote = await this.tikTokSyncClient.getAds(
      accessToken,
      advertiserId,
      [ad.externalId],
    );
    const metrics = await this.safeReport(
      accessToken,
      advertiserId,
      'AUCTION_AD',
      [ad.externalId],
      startDate,
      endDate,
      issues,
    );

    states.push(
      this.toState({
        entityType: SyncEntityType.AD,
        entityId: ad.id,
        externalId: ad.externalId,
        remote: remote[0],
        metrics: metrics.get(ad.externalId),
      }),
    );

    return { states, issues };
  }

  async syncAccount(request: SyncRequest): Promise<{
    states: SyncEntityState[];
    issues: SyncIssue[];
    raw?: unknown;
  }> {
    const issues: SyncIssue[] = [];
    const states: SyncEntityState[] = [];

    if (!request.adAccountId) {
      issues.push({
        code: 'AD_ACCOUNT_ID_REQUIRED',
        message: 'adAccountId is required for account sync.',
      });
      return { states, issues };
    }

    const campaigns = await this.prisma.campaign.findMany({
      where: {
        organizationId: request.organizationId,
        adAccountId: request.adAccountId,
        deletedAt: null,
      },
      select: { id: true },
    });

    for (const campaign of campaigns) {
      const result = await this.syncCampaign({
        ...request,
        campaignId: campaign.id,
      });
      states.push(...result.states);
      issues.push(...result.issues);
    }

    return { states, issues, raw: { campaignCount: campaigns.length } };
  }

  private toState(params: {
    entityType: SyncEntityType;
    entityId: string;
    externalId: string;
    remote?: TikTokSyncEntity;
    metrics?: TikTokSyncMetrics;
  }): SyncEntityState {
    if (!params.remote) {
      return {
        entityType: params.entityType,
        entityId: params.entityId,
        externalId: params.externalId,
        externalStatus: 'DELETED',
        status: 'DELETED',
        remoteDeleted: true,
      };
    }

    const externalStatus =
      params.remote.operation_status ??
      params.remote.secondary_status ??
      params.remote.status ??
      null;

    return {
      entityType: params.entityType,
      entityId: params.entityId,
      externalId: params.externalId,
      externalStatus,
      status: mapTikTokStatus(externalStatus),
      name:
        params.remote.campaign_name ??
        params.remote.adgroup_name ??
        params.remote.ad_name ??
        null,
      metrics: this.toMetrics(params.metrics),
      raw: params.remote,
    };
  }

  private toMetrics(
    metrics?: TikTokSyncMetrics,
  ): SyncMetricsSnapshot | undefined {
    if (!metrics) {
      return undefined;
    }

    const conversions = this.toNumber(
      metrics.conversion ?? metrics.conversions,
    );
    const impressions = this.toInt(metrics.impressions);
    const clicks = this.toInt(metrics.clicks);
    const spend = this.toNumber(metrics.spend);
    const ctr = this.toNumber(metrics.ctr);

    return {
      spend,
      impressions,
      clicks,
      ctr,
      conversions,
      cpc:
        spend != null && clicks != null && clicks > 0
          ? spend / clicks
          : null,
      cpm:
        spend != null && impressions != null && impressions > 0
          ? (spend / impressions) * 1000
          : null,
    };
  }

  private async safeReport(
    accessToken: string,
    advertiserId: string,
    dataLevel: 'AUCTION_CAMPAIGN' | 'AUCTION_ADGROUP' | 'AUCTION_AD',
    ids: string[],
    startDate: string,
    endDate: string,
    issues: SyncIssue[],
  ): Promise<Map<string, TikTokSyncMetrics>> {
    try {
      return await this.tikTokSyncClient.getReportMetrics(
        accessToken,
        advertiserId,
        dataLevel,
        ids,
        startDate,
        endDate,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'TikTok report metrics unavailable.';
      this.logger.warn(message);
      issues.push({
        code: 'TIKTOK_METRICS_UNAVAILABLE',
        message,
      });
      return new Map();
    }
  }

  private last30DayRange(): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();
    start.setUTCDate(end.getUTCDate() - 30);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { startDate: fmt(start), endDate: fmt(end) };
  }

  private toNumber(value?: string | number | null): number | null {
    if (value == null || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private toInt(value?: string | number | null): number | null {
    const n = this.toNumber(value);
    return n == null ? null : Math.round(n);
  }

  private async resolveAccessToken(
    platformConnectionId: string,
    issues: SyncIssue[],
  ): Promise<string | null> {
    const credential = await this.prisma.platformCredential.findFirst({
      where: {
        platformConnectionId,
        isActive: true,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!credential?.accessToken) {
      issues.push({
        code: 'TIKTOK_CREDENTIALS_MISSING',
        message: 'No active TikTok access token found for this connection.',
      });
      return null;
    }

    try {
      return this.encryptionService.decrypt(credential.accessToken);
    } catch {
      return credential.accessToken;
    }
  }
}
