import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PlatformType } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../infrastructure/encryption/encryption.service';
import { SYNC_DEFAULT_DATE_PRESET } from '../../constants/synchronization.constants';
import {
  SyncEntityType,
  SynchronizationPlatform,
} from '../../enums/synchronization.enums';
import { isLocalExternalId } from '../../utils/sync-external-id.util';
import { mapMetaStatus } from '../../utils/sync-status.util';
import { SynchronizationRegistryService } from '../../services/synchronization-registry.service';
import type {
  SyncEntityState,
  SyncIssue,
  SyncMetricsSnapshot,
  SyncRequest,
  SynchronizationProvider,
} from '../interfaces/synchronization-provider.interface';
import { MetaSyncClient } from './meta-sync.client';
import type { MetaSyncActionValue, MetaSyncInsights } from './meta-sync.client';
import { META_SYNC_PURCHASE_ACTION_TYPES } from './meta.sync.constants';

@Injectable()
export class MetaSynchronizationProvider
  implements SynchronizationProvider, OnModuleInit
{
  readonly platform = SynchronizationPlatform.META;

  private readonly logger = new Logger(MetaSynchronizationProvider.name);

  constructor(
    private readonly registry: SynchronizationRegistryService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly metaSyncClient: MetaSyncClient,
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

    if (campaign.adAccount.platform !== PlatformType.META) {
      issues.push({
        code: 'PLATFORM_MISMATCH',
        message: 'Campaign ad account is not Meta.',
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

    const campaignState = await this.syncOneEntity({
      entityType: SyncEntityType.CAMPAIGN,
      entityId: campaign.id,
      externalId: campaign.externalId,
      accessToken,
      issues,
    });
    if (campaignState) {
      states.push(campaignState);
    }

    for (const adSet of campaign.adSets) {
      const adSetState = await this.syncOneEntity({
        entityType: SyncEntityType.AD_SET,
        entityId: adSet.id,
        externalId: adSet.externalId,
        accessToken,
        issues,
      });
      if (adSetState) {
        states.push(adSetState);
      }

      for (const ad of adSet.ads) {
        const adState = await this.syncOneEntity({
          entityType: SyncEntityType.AD,
          entityId: ad.id,
          externalId: ad.externalId,
          accessToken,
          issues,
        });
        if (adState) {
          states.push(adState);
        }
      }
    }

    return { states, issues, raw: { platform: 'META', scope: 'campaign' } };
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

    if (adSet.campaign.adAccount.platform !== PlatformType.META) {
      issues.push({
        code: 'PLATFORM_MISMATCH',
        message: 'Ad set campaign is not on Meta.',
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

    const adSetState = await this.syncOneEntity({
      entityType: SyncEntityType.AD_SET,
      entityId: adSet.id,
      externalId: adSet.externalId,
      accessToken,
      issues,
    });
    if (adSetState) states.push(adSetState);

    for (const ad of adSet.ads) {
      const adState = await this.syncOneEntity({
        entityType: SyncEntityType.AD,
        entityId: ad.id,
        externalId: ad.externalId,
        accessToken,
        issues,
      });
      if (adState) states.push(adState);
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

    if (ad.adSet.campaign.adAccount.platform !== PlatformType.META) {
      issues.push({
        code: 'PLATFORM_MISMATCH',
        message: 'Ad is not on Meta.',
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

    const adState = await this.syncOneEntity({
      entityType: SyncEntityType.AD,
      entityId: ad.id,
      externalId: ad.externalId,
      accessToken,
      issues,
    });
    if (adState) states.push(adState);

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

  private async syncOneEntity(params: {
    entityType: SyncEntityType;
    entityId: string;
    externalId: string;
    accessToken: string;
    issues: SyncIssue[];
  }): Promise<SyncEntityState | null> {
    if (isLocalExternalId(params.externalId)) {
      params.issues.push({
        code: 'NOT_PUBLISHED',
        message: 'Entity has no live platform external ID; skip remote sync.',
        entityType: params.entityType,
        entityId: params.entityId,
      });
      return null;
    }

    try {
      const object = await this.metaSyncClient.getObject(
        params.externalId,
        params.accessToken,
      );

      if (!object) {
        return {
          entityType: params.entityType,
          entityId: params.entityId,
          externalId: params.externalId,
          externalStatus: 'DELETED',
          status: 'DELETED',
          remoteDeleted: true,
        };
      }

      const insights = await this.metaSyncClient.getInsights(
        params.externalId,
        params.accessToken,
        SYNC_DEFAULT_DATE_PRESET,
      );

      const externalStatus =
        object.effective_status ?? object.status ?? null;

      return {
        entityType: params.entityType,
        entityId: params.entityId,
        externalId: object.id,
        externalStatus,
        status: mapMetaStatus(externalStatus),
        name: object.name,
        metrics: this.toMetrics(insights),
        raw: { object, insights },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Meta sync entity failed.';
      this.logger.error(message);
      params.issues.push({
        code: 'META_SYNC_ENTITY_FAILED',
        message,
        entityType: params.entityType,
        entityId: params.entityId,
      });
      return null;
    }
  }

  /**
   * Map Meta Insights into AnalyticsSnapshot fields.
   * Returns zeros when Insights are empty so a snapshot still exists
   * after publish/sync (brand-new campaigns often have no delivery yet).
   */
  private toMetrics(
    insights: MetaSyncInsights | null,
  ): SyncMetricsSnapshot {
    if (!insights) {
      return this.emptyMetrics();
    }

    const spend = this.toNumber(insights.spend);
    const conversions = this.toNumber(
      this.findPurchaseAction(insights.actions)?.value,
    );
    const revenue = this.toNumber(
      this.findPurchaseAction(insights.action_values)?.value,
    );
    const purchaseRoas = this.toNumber(
      this.findPurchaseAction(insights.purchase_roas)?.value,
    );
    const computedRoas =
      spend != null && spend > 0 && revenue != null ? revenue / spend : null;
    const roas = purchaseRoas ?? computedRoas;

    return {
      spend,
      impressions: this.toInt(insights.impressions),
      clicks: this.toInt(insights.clicks),
      reach: this.toInt(insights.reach),
      cpm: this.toNumber(insights.cpm),
      cpc: this.toNumber(insights.cpc),
      ctr: this.toNumber(insights.ctr),
      conversions,
      conversionValue: revenue,
      revenue,
      roas,
    };
  }

  private emptyMetrics(): SyncMetricsSnapshot {
    return {
      spend: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      cpm: 0,
      cpc: 0,
      ctr: 0,
      conversions: 0,
      conversionValue: 0,
      revenue: 0,
      roas: 0,
    };
  }

  private findPurchaseAction(
    values?: MetaSyncActionValue[] | null,
  ): MetaSyncActionValue | undefined {
    if (!values?.length) {
      return undefined;
    }

    for (const actionType of META_SYNC_PURCHASE_ACTION_TYPES) {
      const match = values.find((entry) => entry.action_type === actionType);
      if (match) {
        return match;
      }
    }

    return values.find((entry) =>
      Boolean(entry.action_type?.toLowerCase().includes('purchase')),
    );
  }

  private toNumber(value?: string | null): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private toInt(value?: string | null): number | null {
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
        code: 'META_CREDENTIALS_MISSING',
        message: 'No active Meta access token found for this connection.',
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
