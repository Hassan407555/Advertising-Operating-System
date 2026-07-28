import { Injectable } from '@nestjs/common';
import { PlatformType, Prisma } from '@prisma/client';

import { SynchronizationPlatform } from '../enums/synchronization.enums';
import type { SyncResult } from '../providers/interfaces/synchronization-provider.interface';
import {
  CampaignSyncStatusDto,
  SyncEntityStatusDto,
  SyncResultDto,
} from '../dto/synchronization-response.dto';

type CampaignStatusRow = {
  id: string;
  name: string;
  externalId: string;
  externalStatus: string | null;
  status: string;
  spend: Prisma.Decimal | null;
  impressions: number | null;
  clicks: number | null;
  conversions: Prisma.Decimal | null;
  lastSyncedAt: Date | null;
  lastSuccessfulSyncAt: Date | null;
  lastFailedSyncAt: Date | null;
  adAccount: {
    id: string;
    platform: PlatformType;
    lastSyncedAt: Date | null;
  };
  adSets: Array<{
    id: string;
    name: string;
    externalId: string;
    externalStatus: string | null;
    status: string;
    spend: Prisma.Decimal | null;
    impressions: number | null;
    clicks: number | null;
    conversions: Prisma.Decimal | null;
    lastSyncedAt: Date | null;
    lastSuccessfulSyncAt: Date | null;
    lastFailedSyncAt: Date | null;
    ads: Array<{
      id: string;
      name: string;
      externalId: string;
      externalStatus: string | null;
      status: string;
      spend: Prisma.Decimal | null;
      impressions: number | null;
      clicks: number | null;
      conversions: Prisma.Decimal | null;
      lastSyncedAt: Date | null;
      lastSuccessfulSyncAt: Date | null;
      lastFailedSyncAt: Date | null;
    }>;
  }>;
};

@Injectable()
export class SynchronizationMapper {
  toSyncResponse(result: SyncResult): SyncResultDto {
    return {
      success: result.success,
      platform: result.platform,
      status: result.status,
      scope: result.scope,
      scopeId: result.scopeId,
      entities: result.entities,
      issues: result.issues,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      durationMs: result.durationMs,
    };
  }

  toStatusResponse(campaign: CampaignStatusRow): CampaignSyncStatusDto {
    return {
      campaignId: campaign.id,
      name: campaign.name,
      platform: this.toPlatform(campaign.adAccount.platform),
      externalId: campaign.externalId,
      externalStatus: campaign.externalStatus,
      status: campaign.status,
      spend: this.toNumber(campaign.spend),
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: this.toNumber(campaign.conversions),
      lastSyncedAt: campaign.lastSyncedAt?.toISOString() ?? null,
      lastSuccessfulSyncAt:
        campaign.lastSuccessfulSyncAt?.toISOString() ?? null,
      lastFailedSyncAt: campaign.lastFailedSyncAt?.toISOString() ?? null,
      adSets: campaign.adSets.map((adSet) => ({
        ...this.toEntityStatus(adSet),
        ads: adSet.ads.map((ad) => this.toEntityStatus(ad)),
      })),
    };
  }

  private toEntityStatus(entity: {
    id: string;
    name: string;
    externalId: string;
    externalStatus: string | null;
    status: string;
    spend: Prisma.Decimal | null;
    impressions: number | null;
    clicks: number | null;
    conversions: Prisma.Decimal | null;
    lastSyncedAt: Date | null;
    lastSuccessfulSyncAt: Date | null;
    lastFailedSyncAt: Date | null;
  }): SyncEntityStatusDto {
    return {
      id: entity.id,
      name: entity.name,
      externalId: entity.externalId,
      externalStatus: entity.externalStatus,
      status: entity.status,
      spend: this.toNumber(entity.spend),
      impressions: entity.impressions,
      clicks: entity.clicks,
      conversions: this.toNumber(entity.conversions),
      lastSyncedAt: entity.lastSyncedAt?.toISOString() ?? null,
      lastSuccessfulSyncAt: entity.lastSuccessfulSyncAt?.toISOString() ?? null,
      lastFailedSyncAt: entity.lastFailedSyncAt?.toISOString() ?? null,
    };
  }

  private toPlatform(platform: PlatformType): SynchronizationPlatform {
    return platform === PlatformType.TIKTOK
      ? SynchronizationPlatform.TIKTOK
      : SynchronizationPlatform.META;
  }

  private toNumber(value: Prisma.Decimal | null): number | null {
    return value == null ? null : Number(value);
  }
}
