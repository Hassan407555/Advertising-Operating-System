import { Injectable } from '@nestjs/common';
import {
  AdStatus,
  AdSetStatus,
  AnalyticsLevel,
  CampaignStatus,
  Currency,
  PlatformType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  SyncChangeType,
  SyncEntityType,
  SynchronizationPlatform,
} from '../enums/synchronization.enums';
import type {
  SyncEntityResult,
  SyncEntityState,
  SyncMetricsSnapshot,
} from '../providers/interfaces/synchronization-provider.interface';

/**
 * Applies platform sync states onto existing Campaign / AdSet / Ad rows
 * and upserts a same-day AnalyticsSnapshot for extended metrics.
 * Only writes fields that actually changed.
 */
@Injectable()
export class SynchronizationPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async applyStates(
    platform: SynchronizationPlatform,
    states: SyncEntityState[],
  ): Promise<SyncEntityResult[]> {
    const results: SyncEntityResult[] = [];

    for (const state of states) {
      switch (state.entityType) {
        case SyncEntityType.CAMPAIGN:
          results.push(await this.applyCampaign(platform, state));
          break;
        case SyncEntityType.AD_SET:
          results.push(await this.applyAdSet(platform, state));
          break;
        case SyncEntityType.AD:
          results.push(await this.applyAd(platform, state));
          break;
        default:
          results.push({
            entityType: state.entityType,
            entityId: state.entityId,
            externalId: state.externalId,
            changeType: SyncChangeType.UNCHANGED,
            fieldsUpdated: [],
            message: `Unsupported sync entity type: ${state.entityType}`,
          });
      }
    }

    return results;
  }

  private async applyCampaign(
    platform: SynchronizationPlatform,
    state: SyncEntityState,
  ): Promise<SyncEntityResult> {
    const existing = await this.prisma.campaign.findFirst({
      where: { id: state.entityId, deletedAt: null },
    });

    if (!existing) {
      return {
        entityType: SyncEntityType.CAMPAIGN,
        entityId: state.entityId,
        changeType: SyncChangeType.FAILED,
        fieldsUpdated: [],
        message: 'Campaign not found.',
      };
    }

    if (state.remoteDeleted) {
      const data: Prisma.CampaignUpdateInput = {
        status: CampaignStatus.DELETED,
        externalStatus: state.externalStatus ?? 'DELETED',
        isActive: false,
        deletedAt: existing.deletedAt ?? new Date(),
        lastSyncedAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
      };

      await this.prisma.campaign.update({
        where: { id: existing.id },
        data,
      });

      return {
        entityType: SyncEntityType.CAMPAIGN,
        entityId: existing.id,
        externalId: existing.externalId,
        changeType: SyncChangeType.REMOTE_DELETED,
        fieldsUpdated: ['status', 'externalStatus', 'deletedAt', 'lastSyncedAt'],
      };
    }

    const fieldsUpdated: string[] = [];
    const data: Prisma.CampaignUpdateInput = {
      lastSyncedAt: new Date(),
      lastSuccessfulSyncAt: new Date(),
    };
    fieldsUpdated.push('lastSyncedAt', 'lastSuccessfulSyncAt');

    if (
      state.externalStatus != null &&
      state.externalStatus !== existing.externalStatus
    ) {
      data.externalStatus = state.externalStatus;
      fieldsUpdated.push('externalStatus');
    }

    const mappedStatus = this.mapCampaignStatus(state.status);
    if (mappedStatus && mappedStatus !== existing.status) {
      data.status = mappedStatus;
      data.isActive = mappedStatus === CampaignStatus.ACTIVE;
      fieldsUpdated.push('status', 'isActive');
    }

    this.applyMetricFields(existing, state.metrics, data, fieldsUpdated);

    const meaningful = fieldsUpdated.filter(
      (f) => f !== 'lastSyncedAt' && f !== 'lastSuccessfulSyncAt',
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.campaign.update({
        where: { id: existing.id },
        data,
      });

      await this.upsertAnalyticsSnapshot(
        {
          platform,
          level: AnalyticsLevel.CAMPAIGN,
          organizationId: existing.organizationId,
          campaignId: existing.id,
          currency: existing.currency,
          metrics: state.metrics,
        },
        tx,
      );
    });

    return {
      entityType: SyncEntityType.CAMPAIGN,
      entityId: existing.id,
      externalId: existing.externalId,
      changeType:
        meaningful.length > 0
          ? SyncChangeType.UPDATED
          : SyncChangeType.UNCHANGED,
      fieldsUpdated,
    };
  }

  private async applyAdSet(
    platform: SynchronizationPlatform,
    state: SyncEntityState,
  ): Promise<SyncEntityResult> {
    const existing = await this.prisma.adSet.findFirst({
      where: { id: state.entityId, deletedAt: null },
    });

    if (!existing) {
      return {
        entityType: SyncEntityType.AD_SET,
        entityId: state.entityId,
        changeType: SyncChangeType.FAILED,
        fieldsUpdated: [],
        message: 'Ad set not found.',
      };
    }

    if (state.remoteDeleted) {
      await this.prisma.adSet.update({
        where: { id: existing.id },
        data: {
          status: AdSetStatus.DELETED,
          externalStatus: state.externalStatus ?? 'DELETED',
          isActive: false,
          deletedAt: existing.deletedAt ?? new Date(),
          lastSyncedAt: new Date(),
          lastSuccessfulSyncAt: new Date(),
        },
      });

      return {
        entityType: SyncEntityType.AD_SET,
        entityId: existing.id,
        externalId: existing.externalId,
        changeType: SyncChangeType.REMOTE_DELETED,
        fieldsUpdated: ['status', 'externalStatus', 'deletedAt', 'lastSyncedAt'],
      };
    }

    const fieldsUpdated: string[] = [];
    const data: Prisma.AdSetUpdateInput = {
      lastSyncedAt: new Date(),
      lastSuccessfulSyncAt: new Date(),
    };
    fieldsUpdated.push('lastSyncedAt', 'lastSuccessfulSyncAt');

    if (
      state.externalStatus != null &&
      state.externalStatus !== existing.externalStatus
    ) {
      data.externalStatus = state.externalStatus;
      fieldsUpdated.push('externalStatus');
    }

    const mappedStatus = this.mapAdSetStatus(state.status);
    if (mappedStatus && mappedStatus !== existing.status) {
      data.status = mappedStatus;
      data.isActive = mappedStatus === AdSetStatus.ACTIVE;
      fieldsUpdated.push('status', 'isActive');
    }

    this.applyMetricFields(existing, state.metrics, data, fieldsUpdated);

    const meaningful = fieldsUpdated.filter(
      (f) => f !== 'lastSyncedAt' && f !== 'lastSuccessfulSyncAt',
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.adSet.update({
        where: { id: existing.id },
        data,
      });

      await this.upsertAnalyticsSnapshot(
        {
          platform,
          level: AnalyticsLevel.AD_SET,
          organizationId: existing.organizationId,
          campaignId: existing.campaignId,
          adSetId: existing.id,
          currency: Currency.USD,
          metrics: state.metrics,
        },
        tx,
      );
    });

    return {
      entityType: SyncEntityType.AD_SET,
      entityId: existing.id,
      externalId: existing.externalId,
      changeType:
        meaningful.length > 0
          ? SyncChangeType.UPDATED
          : SyncChangeType.UNCHANGED,
      fieldsUpdated,
    };
  }

  private async applyAd(
    platform: SynchronizationPlatform,
    state: SyncEntityState,
  ): Promise<SyncEntityResult> {
    const existing = await this.prisma.ad.findFirst({
      where: { id: state.entityId, deletedAt: null },
      include: { adSet: { select: { campaignId: true } } },
    });

    if (!existing) {
      return {
        entityType: SyncEntityType.AD,
        entityId: state.entityId,
        changeType: SyncChangeType.FAILED,
        fieldsUpdated: [],
        message: 'Ad not found.',
      };
    }

    if (state.remoteDeleted) {
      await this.prisma.ad.update({
        where: { id: existing.id },
        data: {
          status: AdStatus.DELETED,
          externalStatus: state.externalStatus ?? 'DELETED',
          isActive: false,
          deletedAt: existing.deletedAt ?? new Date(),
          lastSyncedAt: new Date(),
          lastSuccessfulSyncAt: new Date(),
        },
      });

      return {
        entityType: SyncEntityType.AD,
        entityId: existing.id,
        externalId: existing.externalId,
        changeType: SyncChangeType.REMOTE_DELETED,
        fieldsUpdated: ['status', 'externalStatus', 'deletedAt', 'lastSyncedAt'],
      };
    }

    const fieldsUpdated: string[] = [];
    const data: Prisma.AdUpdateInput = {
      lastSyncedAt: new Date(),
      lastSuccessfulSyncAt: new Date(),
    };
    fieldsUpdated.push('lastSyncedAt', 'lastSuccessfulSyncAt');

    if (
      state.externalStatus != null &&
      state.externalStatus !== existing.externalStatus
    ) {
      data.externalStatus = state.externalStatus;
      fieldsUpdated.push('externalStatus');
    }

    const mappedStatus = this.mapAdStatus(state.status);
    if (mappedStatus && mappedStatus !== existing.status) {
      data.status = mappedStatus;
      data.isActive = mappedStatus === AdStatus.ACTIVE;
      fieldsUpdated.push('status', 'isActive');
    }

    this.applyMetricFields(existing, state.metrics, data, fieldsUpdated);

    const meaningful = fieldsUpdated.filter(
      (f) => f !== 'lastSyncedAt' && f !== 'lastSuccessfulSyncAt',
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.ad.update({
        where: { id: existing.id },
        data,
      });

      await this.upsertAnalyticsSnapshot(
        {
          platform,
          level: AnalyticsLevel.AD,
          organizationId: existing.organizationId,
          campaignId: existing.adSet.campaignId,
          adSetId: existing.adSetId,
          adId: existing.id,
          currency: Currency.USD,
          metrics: state.metrics,
        },
        tx,
      );
    });

    return {
      entityType: SyncEntityType.AD,
      entityId: existing.id,
      externalId: existing.externalId,
      changeType:
        meaningful.length > 0
          ? SyncChangeType.UPDATED
          : SyncChangeType.UNCHANGED,
      fieldsUpdated,
    };
  }

  private applyMetricFields(
    existing: {
      spend: Prisma.Decimal | null;
      impressions: number | null;
      clicks: number | null;
      conversions: Prisma.Decimal | null;
    },
    metrics: SyncMetricsSnapshot | undefined,
    data: Record<string, unknown>,
    fieldsUpdated: string[],
  ): void {
    if (!metrics) {
      return;
    }

    if (
      metrics.spend != null &&
      !this.decimalEquals(existing.spend, metrics.spend)
    ) {
      data.spend = new Prisma.Decimal(metrics.spend);
      fieldsUpdated.push('spend');
    }

    if (
      metrics.impressions != null &&
      existing.impressions !== metrics.impressions
    ) {
      data.impressions = metrics.impressions;
      fieldsUpdated.push('impressions');
    }

    if (metrics.clicks != null && existing.clicks !== metrics.clicks) {
      data.clicks = metrics.clicks;
      fieldsUpdated.push('clicks');
    }

    if (
      metrics.conversions != null &&
      !this.decimalEquals(existing.conversions, metrics.conversions)
    ) {
      data.conversions = new Prisma.Decimal(metrics.conversions);
      fieldsUpdated.push('conversions');
    }
  }

  private async upsertAnalyticsSnapshot(
    params: {
      platform: SynchronizationPlatform;
      level: AnalyticsLevel;
      organizationId: string;
      campaignId?: string;
      adSetId?: string;
      adId?: string;
      currency: Currency;
      metrics?: SyncMetricsSnapshot;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    if (!params.metrics) {
      return;
    }

    const snapshotDate = new Date();
    snapshotDate.setUTCHours(0, 0, 0, 0);

    const platform = params.platform as PlatformType;
    const uniqueKey = this.buildAnalyticsSnapshotUniqueKey({
      organizationId: params.organizationId,
      platform,
      level: params.level,
      snapshotDate,
      campaignId: params.campaignId,
      adSetId: params.adSetId,
      adId: params.adId,
    });

    const data = {
      impressions: params.metrics.impressions ?? 0,
      reach: params.metrics.reach ?? 0,
      clicks: params.metrics.clicks ?? 0,
      spend: new Prisma.Decimal(params.metrics.spend ?? 0),
      cpc:
        params.metrics.cpc != null
          ? new Prisma.Decimal(params.metrics.cpc)
          : null,
      cpm:
        params.metrics.cpm != null
          ? new Prisma.Decimal(params.metrics.cpm)
          : null,
      ctr:
        params.metrics.ctr != null
          ? new Prisma.Decimal(params.metrics.ctr)
          : null,
      conversions:
        params.metrics.conversions != null
          ? new Prisma.Decimal(params.metrics.conversions)
          : null,
      lastSyncedAt: new Date(),
      currency: params.currency,
    };

    await tx.analyticsSnapshot.upsert({
      where: { uniqueKey },
      create: {
        uniqueKey,
        organizationId: params.organizationId,
        platform,
        level: params.level,
        campaignId: params.campaignId,
        adSetId: params.adSetId,
        adId: params.adId,
        snapshotDate,
        ...data,
      },
      update: data,
    });
  }

  private buildAnalyticsSnapshotUniqueKey(params: {
    organizationId: string;
    platform: PlatformType;
    level: AnalyticsLevel;
    snapshotDate: Date;
    campaignId?: string;
    adSetId?: string;
    adId?: string;
    creativeId?: string;
  }): string {
    const snapshotDate = params.snapshotDate
      .toISOString()
      .slice(0, 10);

    return [
      params.organizationId,
      params.platform,
      params.level,
      snapshotDate,
      params.campaignId ?? '',
      params.adSetId ?? '',
      params.adId ?? '',
      params.creativeId ?? '',
    ].join('|');
  }

  private mapCampaignStatus(status?: string | null): CampaignStatus | null {
    if (!status) return null;
    const normalized = status.toUpperCase();
    if (normalized in CampaignStatus) {
      return CampaignStatus[normalized as keyof typeof CampaignStatus];
    }
    return null;
  }

  private mapAdSetStatus(status?: string | null): AdSetStatus | null {
    if (!status) return null;
    const normalized = status.toUpperCase();
    if (normalized in AdSetStatus) {
      return AdSetStatus[normalized as keyof typeof AdSetStatus];
    }
    return null;
  }

  private mapAdStatus(status?: string | null): AdStatus | null {
    if (!status) return null;
    const normalized = status.toUpperCase();
    if (normalized in AdStatus) {
      return AdStatus[normalized as keyof typeof AdStatus];
    }
    return null;
  }

  private decimalEquals(
    current: Prisma.Decimal | null,
    next: number,
  ): boolean {
    if (current == null) {
      return false;
    }
    return Number(current) === next;
  }
}
