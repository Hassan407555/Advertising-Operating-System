import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformType } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { SYNCHRONIZATION_V1_PLATFORMS } from '../constants/synchronization.constants';
import {
  SyncEntityType,
  SyncStatus,
  SynchronizationPlatform,
} from '../enums/synchronization.enums';
import { SynchronizationMapper } from '../mappers/synchronization.mapper';
import type {
  SyncRequest,
  SyncResult,
} from '../providers/interfaces/synchronization-provider.interface';
import { SynchronizationPersistenceService } from './synchronization-persistence.service';
import { SynchronizationRegistryService } from './synchronization-registry.service';

@Injectable()
export class SynchronizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: SynchronizationRegistryService,
    private readonly persistence: SynchronizationPersistenceService,
    private readonly mapper: SynchronizationMapper,
  ) {}

  async syncCampaign(
    campaignId: string,
    currentUser: JwtPayload,
  ): Promise<SyncResult> {
    const startedAt = new Date();
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
      include: { adAccount: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found.');
    }

    const platform = this.toSyncPlatform(campaign.adAccount.platform);
    const provider = this.registry.get(platform);

    const request: SyncRequest = {
      organizationId: currentUser.organizationId,
      platform,
      campaignId,
      adAccountId: campaign.adAccountId,
      requestedByUserId: currentUser.sub,
    };

    try {
      const pulled = await provider.syncCampaign(request);
      const entities = await this.persistence.applyStates(
        platform,
        pulled.states,
      );
      const status = this.resolveStatus(entities, pulled.issues);

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: this.toSyncTimestampPatch(status),
      });

      return this.toResult({
        success: this.isSuccessfulStatus(status),
        platform,
        status,
        scope: SyncEntityType.CAMPAIGN,
        scopeId: campaignId,
        entities,
        issues: pulled.issues,
        startedAt,
        raw: pulled.raw,
      });
    } catch (error) {
      await this.markCampaignSyncFailed(campaignId);
      throw error;
    }
  }

  async syncAdSet(
    adSetId: string,
    currentUser: JwtPayload,
  ): Promise<SyncResult> {
    const startedAt = new Date();
    const adSet = await this.prisma.adSet.findFirst({
      where: {
        id: adSetId,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
      include: {
        campaign: { include: { adAccount: true } },
      },
    });

    if (!adSet) {
      throw new NotFoundException('Ad set not found.');
    }

    const platform = this.toSyncPlatform(adSet.campaign.adAccount.platform);
    const provider = this.registry.get(platform);

    const pulled = await provider.syncAdSet({
      organizationId: currentUser.organizationId,
      platform,
      adSetId,
      campaignId: adSet.campaignId,
      adAccountId: adSet.campaign.adAccountId,
      requestedByUserId: currentUser.sub,
    });

    const entities = await this.persistence.applyStates(platform, pulled.states);
    const status = this.resolveStatus(entities, pulled.issues);

    await this.prisma.adSet.update({
      where: { id: adSetId },
      data: this.toSyncTimestampPatch(status),
    });

    return this.toResult({
      success: this.isSuccessfulStatus(status),
      platform,
      status,
      scope: SyncEntityType.AD_SET,
      scopeId: adSetId,
      entities,
      issues: pulled.issues,
      startedAt,
      raw: pulled.raw,
    });
  }

  async syncAd(adId: string, currentUser: JwtPayload): Promise<SyncResult> {
    const startedAt = new Date();
    const ad = await this.prisma.ad.findFirst({
      where: {
        id: adId,
        organizationId: currentUser.organizationId,
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
      throw new NotFoundException('Ad not found.');
    }

    const platform = this.toSyncPlatform(ad.adSet.campaign.adAccount.platform);
    const provider = this.registry.get(platform);

    const pulled = await provider.syncAd({
      organizationId: currentUser.organizationId,
      platform,
      adId,
      adSetId: ad.adSetId,
      campaignId: ad.adSet.campaignId,
      adAccountId: ad.adSet.campaign.adAccountId,
      requestedByUserId: currentUser.sub,
    });

    const entities = await this.persistence.applyStates(platform, pulled.states);
    const status = this.resolveStatus(entities, pulled.issues);

    await this.prisma.ad.update({
      where: { id: adId },
      data: this.toSyncTimestampPatch(status),
    });

    return this.toResult({
      success: this.isSuccessfulStatus(status),
      platform,
      status,
      scope: SyncEntityType.AD,
      scopeId: adId,
      entities,
      issues: pulled.issues,
      startedAt,
      raw: pulled.raw,
    });
  }

  async syncAccount(
    adAccountId: string,
    currentUser: JwtPayload,
  ): Promise<SyncResult> {
    const startedAt = new Date();
    const adAccount = await this.prisma.adAccount.findFirst({
      where: {
        id: adAccountId,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
    });

    if (!adAccount) {
      throw new NotFoundException('Ad account not found.');
    }

    const platform = this.toSyncPlatform(adAccount.platform);
    const provider = this.registry.get(platform);

    const pulled = await provider.syncAccount({
      organizationId: currentUser.organizationId,
      platform,
      adAccountId,
      requestedByUserId: currentUser.sub,
    });

    const entities = await this.persistence.applyStates(platform, pulled.states);
    const status = this.resolveStatus(entities, pulled.issues);

    // Keep timestamps aligned with resolved run outcome.
    await this.prisma.adAccount.update({
      where: { id: adAccountId },
      data: this.toSyncTimestampPatch(status),
    });

    return this.toResult({
      success: this.isSuccessfulStatus(status),
      platform,
      status,
      scope: SyncEntityType.AD_ACCOUNT,
      scopeId: adAccountId,
      entities,
      issues: pulled.issues,
      startedAt,
      raw: pulled.raw,
    });
  }

  async syncOrganization(currentUser: JwtPayload): Promise<SyncResult> {
    const startedAt = new Date();
    const accounts = await this.prisma.adAccount.findMany({
      where: {
        organizationId: currentUser.organizationId,
        deletedAt: null,
        isActive: true,
        platform: {
          in: [PlatformType.META, PlatformType.TIKTOK],
        },
      },
      select: { id: true, platform: true },
    });

    const allEntities: SyncResult['entities'] = [];
    const allIssues: SyncResult['issues'] = [];
    let platform = SynchronizationPlatform.META;

    for (const account of accounts) {
      platform = this.toSyncPlatform(account.platform);
      const result = await this.syncAccount(account.id, currentUser);
      allEntities.push(...result.entities);
      allIssues.push(...result.issues);
    }

    const status = this.resolveStatus(allEntities, allIssues);

    return this.toResult({
      success: this.isSuccessfulStatus(status),
      platform,
      status,
      scope: SyncEntityType.ORGANIZATION,
      scopeId: currentUser.organizationId,
      entities: allEntities,
      issues: allIssues,
      startedAt,
      raw: { accountCount: accounts.length },
    });
  }

  async getCampaignSyncStatus(
    campaignId: string,
    currentUser: JwtPayload,
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId: currentUser.organizationId,
      },
      include: {
        adAccount: {
          select: {
            id: true,
            platform: true,
            lastSyncedAt: true,
          },
        },
        adSets: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            externalId: true,
            externalStatus: true,
            status: true,
            spend: true,
            impressions: true,
            clicks: true,
            conversions: true,
            lastSyncedAt: true,
            lastSuccessfulSyncAt: true,
            lastFailedSyncAt: true,
            ads: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                externalId: true,
                externalStatus: true,
                status: true,
                spend: true,
                impressions: true,
                clicks: true,
                conversions: true,
                lastSyncedAt: true,
                lastSuccessfulSyncAt: true,
                lastFailedSyncAt: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found.');
    }

    return this.mapper.toStatusResponse(campaign);
  }

  async getOrganizationSyncSummary(organizationId: string): Promise<{
    lastSynchronization: Date | null;
    campaignsSynced: number;
    failedSyncs: number;
  }> {
    const [synced, failed, latest] = await Promise.all([
      this.prisma.campaign.count({
        where: {
          organizationId,
          deletedAt: null,
          lastSuccessfulSyncAt: { not: null },
        },
      }),
      this.prisma.campaign.count({
        where: {
          organizationId,
          deletedAt: null,
          lastFailedSyncAt: { not: null },
        },
      }),
      this.prisma.campaign.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          lastSyncedAt: { not: null },
        },
        orderBy: { lastSyncedAt: 'desc' },
        select: { lastSyncedAt: true },
      }),
    ]);

    return {
      lastSynchronization: latest?.lastSyncedAt ?? null,
      campaignsSynced: synced,
      failedSyncs: failed,
    };
  }

  async listRecentSynchronizations(
    organizationId: string,
    limit = 5,
  ): Promise<
    Array<{
      id: string;
      name: string;
      externalStatus: string | null;
      lastSyncedAt: Date | null;
      lastSuccessfulSyncAt: Date | null;
      lastFailedSyncAt: Date | null;
    }>
  > {
    return this.prisma.campaign.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { lastSyncedAt: { not: null } },
          { lastSuccessfulSyncAt: { not: null } },
          { lastFailedSyncAt: { not: null } },
        ],
      },
      orderBy: { lastSyncedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        externalStatus: true,
        lastSyncedAt: true,
        lastSuccessfulSyncAt: true,
        lastFailedSyncAt: true,
      },
    });
  }

  private toSyncPlatform(platform: PlatformType): SynchronizationPlatform {
    if (platform === PlatformType.META) {
      return SynchronizationPlatform.META;
    }
    if (platform === PlatformType.TIKTOK) {
      return SynchronizationPlatform.TIKTOK;
    }

    throw new BadRequestException(
      `Platform ${platform} is not supported for synchronization. Supported: ${SYNCHRONIZATION_V1_PLATFORMS.join(', ')}.`,
    );
  }

  private resolveStatus(
    entities: SyncResult['entities'],
    issues: SyncResult['issues'],
  ): SyncStatus {
    const hardFailures = issues.filter(
      (issue) =>
        issue.code !== 'NOT_PUBLISHED' &&
        issue.code !== 'TIKTOK_METRICS_UNAVAILABLE',
    );

    if (hardFailures.length > 0 && entities.length === 0) {
      return SyncStatus.FAILED;
    }

    if (hardFailures.length > 0) {
      return SyncStatus.PARTIAL;
    }

    if (entities.length === 0) {
      return SyncStatus.SKIPPED;
    }

    return SyncStatus.SUCCESS;
  }

  private isSuccessfulStatus(status: SyncStatus): boolean {
    return status === SyncStatus.SUCCESS || status === SyncStatus.SKIPPED;
  }

  private toSyncTimestampPatch(status: SyncStatus): {
    lastSyncedAt: Date;
    lastSuccessfulSyncAt?: Date;
    lastFailedSyncAt?: Date;
  } {
    const now = new Date();

    if (this.isSuccessfulStatus(status)) {
      return {
        lastSyncedAt: now,
        lastSuccessfulSyncAt: now,
      };
    }

    return {
      lastSyncedAt: now,
      lastFailedSyncAt: now,
    };
  }

  private async markCampaignSyncFailed(campaignId: string): Promise<void> {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        lastSyncedAt: new Date(),
        lastFailedSyncAt: new Date(),
      },
    });
  }

  private toResult(params: {
    success: boolean;
    platform: SynchronizationPlatform;
    status: SyncStatus;
    scope: SyncEntityType;
    scopeId: string;
    entities: SyncResult['entities'];
    issues: SyncResult['issues'];
    startedAt: Date;
    raw?: unknown;
  }): SyncResult {
    const completedAt = new Date();

    return {
      success: params.success,
      platform: params.platform,
      status: params.status,
      scope: params.scope,
      scopeId: params.scopeId,
      entities: params.entities,
      issues: params.issues,
      startedAt: params.startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - params.startedAt.getTime(),
      raw: params.raw,
    };
  }
}
