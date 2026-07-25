import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  AnalyticsSnapshotWithRelations,
} from '../constants/analytics.constants';
import { AnalyticsResponseDto } from '../dto/analytics-response.dto';

@Injectable()
export class AnalyticsMapper {
  toResponse(
    snapshot: AnalyticsSnapshotWithRelations,
  ): AnalyticsResponseDto {
    return {
      id: snapshot.id,

      organizationId: snapshot.organizationId,

      platform: snapshot.platform,

      level: snapshot.level,

      campaignId: snapshot.campaignId,

      adSetId: snapshot.adSetId,

      adId: snapshot.adId,

      creativeId: snapshot.creativeId,

      snapshotDate: snapshot.snapshotDate,

      currency: snapshot.currency,

      impressions: snapshot.impressions,

      reach: snapshot.reach,

      clicks: snapshot.clicks,

      linkClicks: snapshot.linkClicks,

      spend: this.decimalToNumber(snapshot.spend),

      cpc: this.decimalToNullableNumber(snapshot.cpc),

      cpm: this.decimalToNullableNumber(snapshot.cpm),

      ctr: this.decimalToNullableNumber(snapshot.ctr),

      conversions: this.decimalToNullableNumber(
        snapshot.conversions,
      ),

      conversionValue: this.decimalToNullableNumber(
        snapshot.conversionValue,
      ),

      revenue: this.decimalToNullableNumber(
        snapshot.revenue,
      ),

      roas: this.decimalToNullableNumber(
        snapshot.roas,
      ),

      videoViews: snapshot.videoViews,

      platformMetrics:
        snapshot.platformMetrics as
          | Record<string, unknown>
          | null,

      lastSyncedAt: snapshot.lastSyncedAt,

      createdAt: snapshot.createdAt,

      updatedAt: snapshot.updatedAt,

      campaignName: snapshot.campaign?.name ?? null,

      adSetName: snapshot.adSet?.name ?? null,

      adName: snapshot.ad?.name ?? null,

      creativeName: snapshot.creative?.name ?? null,
    };
  }

  private decimalToNumber(
    value: Prisma.Decimal | number,
  ): number {
    if (value instanceof Prisma.Decimal) {
      return value.toNumber();
    }

    return Number(value);
  }

  private decimalToNullableNumber(
    value: Prisma.Decimal | number | null,
  ): number | null {
    if (value === null) {
      return null;
    }

    if (value instanceof Prisma.Decimal) {
      return value.toNumber();
    }

    return Number(value);
  }
}