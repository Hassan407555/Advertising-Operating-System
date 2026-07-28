import { Injectable, Logger } from '@nestjs/common';
import {
  AutomationRunStatus,
  CampaignStatus,
  ConnectionStatus,
  CreativeAssetType,
  PlatformType,
  PublishJobStatus,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import { AnalyticsQueryDto } from '../../analytics/dto/analytics-query.dto';
import { AutomationRunService } from '../../automation/services/automation-run.service';
import { CampaignsService } from '../../campaigns/services/campaigns.service';
import { CreativeAssetsService } from '../../creative-assets/creative-assets.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { PlatformConnectionsService } from '../../platform-connections/platform-connections.service';
import { PlatformCredentialsService } from '../../platform-credentials/platform-credentials.service';
import { ShopifyService } from '../../shopify/services/shopify.service';
import { SynchronizationService } from '../../synchronization/services/synchronization.service';
import { SYNC_LOCAL_EXTERNAL_ID_PREFIXES } from '../../synchronization/constants/synchronization.constants';

import {
  AnalyticsSummaryDto,
  AssetsSummaryDto,
  AutomationSummaryDto,
  AdvertisingSummaryDto,
  CampaignSummaryDto,
  DashboardSummaryDto,
  OrganizationSummaryDto,
  PlatformsSummaryDto,
  PlatformConnectionSummaryDto,
  RecentActivityDto,
  ShopifySummaryDto,
  SynchronizationSummaryDto,
} from '../dto/dashboard-response.dto';

const RECENT_LIMIT = 5;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly campaignsService: CampaignsService,
    private readonly analyticsService: AnalyticsService,
    private readonly creativeAssetsService: CreativeAssetsService,
    private readonly platformConnectionsService: PlatformConnectionsService,
    private readonly platformCredentialsService: PlatformCredentialsService,
    private readonly automationRunService: AutomationRunService,
    private readonly shopifyService: ShopifyService,
    private readonly synchronizationService: SynchronizationService,
    private readonly prisma: PrismaService,
  ) {}

  async getSummary(currentUser: JwtPayload): Promise<DashboardSummaryDto> {
    const [
      organization,
      campaigns,
      advertising,
      automation,
      synchronization,
      analytics,
      assets,
      shopify,
      platforms,
      recent,
    ] = await Promise.all([
      this.getOrganizationSummary(currentUser),
      this.getCampaignSummary(currentUser),
      this.getAdvertisingSummary(currentUser),
      this.getAutomationSummary(currentUser),
      this.getSynchronizationSummary(currentUser),
      this.getAnalyticsSummary(currentUser),
      this.getAssetsSummary(currentUser),
      this.getShopifySummary(currentUser),
      this.getPlatformsSummary(currentUser),
      this.getRecentActivity(currentUser),
    ]);

    return {
      organization,
      campaigns,
      advertising,
      automation,
      synchronization,
      analytics,
      assets,
      shopify,
      platforms,
      recent,
    };
  }

  async getAnalyticsSummary(
    currentUser: JwtPayload,
  ): Promise<AnalyticsSummaryDto> {
    const query = Object.assign(new AnalyticsQueryDto(), {
      page: 1,
      limit: 1,
    });
    const summary = await this.analyticsService.getSummary(query, currentUser);

    return {
      spend: summary.spend ?? 0,
      revenue: summary.revenue ?? 0,
      impressions: summary.impressions ?? 0,
      clicks: summary.clicks ?? 0,
      ctr: summary.ctr ?? null,
      cpc: summary.cpc ?? null,
      cpm: summary.cpm ?? null,
      conversions: summary.conversions ?? 0,
      roas: summary.roas ?? null,
    };
  }

  async getCampaignSummary(
    currentUser: JwtPayload,
  ): Promise<CampaignSummaryDto> {
    const orgId = currentUser.organizationId;

    const [total, draft, active, paused, archived, published] =
      await Promise.all([
        this.countCampaigns(currentUser),
        this.countCampaigns(currentUser, CampaignStatus.DRAFT),
        this.countCampaigns(currentUser, CampaignStatus.ACTIVE),
        this.countCampaigns(currentUser, CampaignStatus.PAUSED),
        this.countCampaigns(currentUser, CampaignStatus.ARCHIVED),
        this.prisma.campaign.count({
          where: {
            organizationId: orgId,
            deletedAt: null,
            AND: SYNC_LOCAL_EXTERNAL_ID_PREFIXES.map((prefix) => ({
              NOT: { externalId: { startsWith: prefix } },
            })),
          },
        }),
      ]);

    return {
      total,
      draft,
      published,
      active,
      paused,
      archived,
    };
  }

  async getAdvertisingSummary(
    currentUser: JwtPayload,
  ): Promise<AdvertisingSummaryDto> {
    const [metaCampaigns, tiktokCampaigns] = await Promise.all([
      this.countCampaigns(currentUser, undefined, PlatformType.META),
      this.countCampaigns(currentUser, undefined, PlatformType.TIKTOK),
    ]);

    return { metaCampaigns, tiktokCampaigns };
  }

  async getAutomationSummary(
    currentUser: JwtPayload,
  ): Promise<AutomationSummaryDto> {
    const [total, running, completed, failed] = await Promise.all([
      this.countAutomationRuns(currentUser),
      this.countAutomationRuns(currentUser, AutomationRunStatus.RUNNING),
      this.countAutomationRuns(currentUser, AutomationRunStatus.COMPLETED),
      this.countAutomationRuns(currentUser, AutomationRunStatus.FAILED),
    ]);

    return {
      totalWorkflowRuns: total,
      running,
      completed,
      failed,
    };
  }

  async getPlatformsSummary(
    currentUser: JwtPayload,
  ): Promise<PlatformsSummaryDto> {
    const connections = await this.platformConnectionsService.findAll(
      { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
      currentUser,
    );

    const metaConnection = connections.data.find(
      (c) => c.platform === PlatformType.META,
    );
    const tiktokConnection = connections.data.find(
      (c) => c.platform === PlatformType.TIKTOK,
    );

    const [meta, tiktok] = await Promise.all([
      this.toPlatformSummary(metaConnection, currentUser),
      this.toPlatformSummary(tiktokConnection, currentUser),
    ]);

    return { meta, tiktok };
  }

  async getRecentActivity(currentUser: JwtPayload): Promise<RecentActivityDto> {
    const orgId = currentUser.organizationId;

    const [campaignsPage, runsPage, publishJobs, syncRows] = await Promise.all([
      this.campaignsService.findAll(
        {
          page: 1,
          limit: RECENT_LIMIT,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        },
        currentUser,
      ),
      this.automationRunService.findAll(
        {
          page: 1,
          limit: RECENT_LIMIT,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
        currentUser,
      ),
      this.findRecentPublishJobs(orgId),
      this.synchronizationService.listRecentSynchronizations(
        orgId,
        RECENT_LIMIT,
      ),
    ]);

    return {
      campaigns: campaignsPage.data.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        platform: campaign.adAccount?.platform ?? null,
        updatedAt: this.toIsoRequired(campaign.updatedAt),
      })),
      automationRuns: runsPage.data.map((run) => ({
        id: run.id,
        pipelineId: run.pipelineId,
        status: run.status,
        triggerType: run.triggerType,
        startedAt: this.toIso(run.startedAt),
        completedAt: this.toIso(run.completedAt),
        createdAt: this.toIsoRequired(run.createdAt),
      })),
      publishJobs,
      synchronizations: syncRows.map((campaign) => ({
        campaignId: campaign.id,
        name: campaign.name,
        externalStatus: campaign.externalStatus,
        lastSyncedAt: this.toIso(campaign.lastSyncedAt),
        lastSuccessfulSyncAt: this.toIso(campaign.lastSuccessfulSyncAt),
        lastFailedSyncAt: this.toIso(campaign.lastFailedSyncAt),
      })),
    };
  }

  private async getOrganizationSummary(
    currentUser: JwtPayload,
  ): Promise<OrganizationSummaryDto> {
    const [org, connections] = await Promise.all([
      this.organizationsService.getCurrent(currentUser),
      this.platformConnectionsService.findAll(
        { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
        currentUser,
      ),
    ]);

    const connectedPlatforms = [
      ...new Set(
        connections.data
          .filter((c) => c.status === ConnectionStatus.ACTIVE)
          .map((c) => c.platform),
      ),
    ];

    return {
      totalOrganizations: 1,
      activeOrganizationId: org.id,
      activeOrganizationName: org.name,
      connectedPlatforms,
    };
  }

  private async getSynchronizationSummary(
    currentUser: JwtPayload,
  ): Promise<SynchronizationSummaryDto> {
    const summary =
      await this.synchronizationService.getOrganizationSyncSummary(
        currentUser.organizationId,
      );

    return {
      lastSynchronization: this.toIso(summary.lastSynchronization),
      campaignsSynced: summary.campaignsSynced,
      failedSyncs: summary.failedSyncs,
    };
  }

  private async getAssetsSummary(
    currentUser: JwtPayload,
  ): Promise<AssetsSummaryDto> {
    const [images, videos, totalAssets] = await Promise.all([
      this.countAssets(currentUser, CreativeAssetType.IMAGE),
      this.countAssets(currentUser, CreativeAssetType.VIDEO),
      this.countAssets(currentUser),
    ]);

    return { images, videos, totalAssets };
  }

  private async getShopifySummary(
    currentUser: JwtPayload,
  ): Promise<ShopifySummaryDto> {
    const [products, store] = await Promise.all([
      this.prisma.shopifyProduct.count({
        where: {
          organizationId: currentUser.organizationId,
          deletedAt: null,
        },
      }),
      this.shopifyService.getStore(currentUser).catch((error) => {
        this.logger.debug(
          `Shopify store unavailable: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return null;
      }),
    ]);

    return {
      products,
      collections: 0,
      storeConnected: Boolean(store),
    };
  }

  private async toPlatformSummary(
    connection:
      | {
          id: string;
          status: ConnectionStatus;
          accountName: string;
          lastSyncedAt?: Date | null;
        }
      | undefined,
    currentUser: JwtPayload,
  ): Promise<PlatformConnectionSummaryDto> {
    if (!connection) {
      return {
        connected: false,
        tokenStatus: 'MISSING',
        connectionStatus: null,
        accountName: null,
        lastSyncedAt: null,
      };
    }

    const credentials = await this.platformCredentialsService.findAll(
      {
        page: 1,
        limit: 5,
        platformConnectionId: connection.id,
        isActive: true,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      currentUser,
    );

    const credential = credentials.data[0];
    let tokenStatus = 'MISSING';

    if (credential) {
      if (credential.revokedAt) {
        tokenStatus = 'REVOKED';
      } else if (
        credential.expiresAt &&
        new Date(credential.expiresAt).getTime() < Date.now()
      ) {
        tokenStatus = 'EXPIRED';
      } else if (credential.isActive) {
        tokenStatus = 'ACTIVE';
      } else {
        tokenStatus = 'INACTIVE';
      }
    }

    return {
      connected: connection.status === ConnectionStatus.ACTIVE,
      tokenStatus,
      connectionStatus: connection.status,
      accountName: connection.accountName,
      lastSyncedAt: this.toIso(connection.lastSyncedAt),
    };
  }

  private async countCampaigns(
    currentUser: JwtPayload,
    status?: CampaignStatus,
    platform?: PlatformType,
  ): Promise<number> {
    const result = await this.campaignsService.findAll(
      {
        page: 1,
        limit: 1,
        status,
        platform,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      currentUser,
    );

    return result.meta.total;
  }

  private async countAutomationRuns(
    currentUser: JwtPayload,
    status?: AutomationRunStatus,
  ): Promise<number> {
    const result = await this.automationRunService.findAll(
      {
        page: 1,
        limit: 1,
        status,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      currentUser,
    );

    return result.meta.total;
  }

  private async countAssets(
    currentUser: JwtPayload,
    assetType?: CreativeAssetType,
  ): Promise<number> {
    const result = await this.creativeAssetsService.findAll(
      {
        page: 1,
        limit: 1,
        assetType,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      currentUser,
    );

    return result.meta.total;
  }

  private async findRecentPublishJobs(organizationId: string) {
    // No Publisher list API exists yet — Prisma read-only access is required.
    const jobs = await this.prisma.publishJob.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
      select: {
        id: true,
        campaignId: true,
        platform: true,
        status: true,
        dryRun: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });

    return jobs.map((job) => ({
      id: job.id,
      campaignId: job.campaignId,
      platform: job.platform,
      status: job.status as PublishJobStatus | string,
      dryRun: job.dryRun,
      startedAt: this.toIso(job.startedAt),
      completedAt: this.toIso(job.completedAt),
      createdAt: this.toIsoRequired(job.createdAt),
    }));
  }

  private toIso(value?: Date | string | null): string | null {
    if (!value) {
      return null;
    }

    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private toIsoRequired(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
