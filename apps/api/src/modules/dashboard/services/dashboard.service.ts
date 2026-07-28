import { Injectable, Logger } from '@nestjs/common';
import {
  CampaignStatus,
  ConnectionStatus,
  CreativeAssetType,
  PlatformType,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import { AnalyticsQueryDto } from '../../analytics/dto/analytics-query.dto';
import { CampaignsService } from '../../campaigns/services/campaigns.service';
import { CreativeAssetsService } from '../../creative-assets/creative-assets.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { PlatformConnectionsService } from '../../platform-connections/platform-connections.service';
import { PlatformCredentialsService } from '../../platform-credentials/platform-credentials.service';
import { ShopifyService } from '../../shopify/services/shopify.service';

import {
  AiSessionsSummaryDto,
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

/** Prefixes that indicate the entity was never published to a live platform. */
const LOCAL_EXTERNAL_ID_PREFIXES = ['local_', 'meta_dry_', 'pending:'] as const;

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
    private readonly shopifyService: ShopifyService,
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
      aiSessions,
      platforms,
      recent,
    ] = await Promise.all([
      this.getOrganizationSummary(currentUser),
      this.getCampaignSummary(currentUser),
      this.getAdvertisingSummary(currentUser),
      this.getAutomationSummary(),
      this.getSynchronizationSummary(),
      this.getAnalyticsSummary(currentUser),
      this.getAssetsSummary(currentUser),
      this.getShopifySummary(currentUser),
      this.getAiSessionsSummary(currentUser),
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
      aiSessions,
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
            AND: LOCAL_EXTERNAL_ID_PREFIXES.map((prefix) => ({
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
    const metaCampaigns = await this.countCampaigns(
      currentUser,
      undefined,
      PlatformType.META,
    );

    return { metaCampaigns };
  }

  async getAutomationSummary(): Promise<AutomationSummaryDto> {
    // Legacy automation module is unwired — keep DTO shape for clients.
    return {
      totalWorkflowRuns: 0,
      running: 0,
      completed: 0,
      failed: 0,
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

    const meta = await this.toPlatformSummary(metaConnection, currentUser);

    return { meta };
  }

  async getRecentActivity(currentUser: JwtPayload): Promise<RecentActivityDto> {
    const orgId = currentUser.organizationId;

    const [campaignsPage, recentAiSessions, recentStores] = await Promise.all([
      this.campaignsService.findAll(
        {
          page: 1,
          limit: RECENT_LIMIT,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        },
        currentUser,
      ),
      this.prisma.aiSession.findMany({
        where: { organizationId: orgId },
        orderBy: { lastActivityAt: 'desc' },
        take: RECENT_LIMIT,
        select: {
          id: true,
          status: true,
          currentPhase: true,
          productId: true,
          shopifyStoreId: true,
          lastActivityAt: true,
          product: { select: { title: true } },
          shopifyStore: { select: { accountName: true } },
        },
      }),
      this.prisma.platformConnection.findMany({
        where: {
          organizationId: orgId,
          platform: PlatformType.SHOPIFY,
          deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
        take: RECENT_LIMIT,
        select: {
          id: true,
          accountName: true,
          accountId: true,
          status: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      campaigns: campaignsPage.data.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        platform: campaign.adAccount?.platform ?? null,
        updatedAt: this.toIsoRequired(campaign.updatedAt),
      })),
      aiSessions: recentAiSessions.map((session) => ({
        id: session.id,
        status: session.status,
        currentPhase: session.currentPhase,
        productId: session.productId,
        productTitle: session.product.title ?? null,
        shopifyStoreId: session.shopifyStoreId,
        storeName: session.shopifyStore.accountName ?? null,
        lastActivityAt: this.toIsoRequired(session.lastActivityAt),
      })),
      stores: recentStores.map((store) => ({
        id: store.id,
        name: store.accountName,
        shopDomain: store.accountId,
        status: store.status,
        updatedAt: this.toIsoRequired(store.updatedAt),
      })),
      automationRuns: [],
      publishJobs: [],
      synchronizations: [],
    };
  }

  private async getOrganizationSummary(
    currentUser: JwtPayload,
  ): Promise<OrganizationSummaryDto> {
    const [org, connections, totalOrganizations] = await Promise.all([
      this.organizationsService.getCurrent(currentUser),
      this.platformConnectionsService.findAll(
        { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
        currentUser,
      ),
      this.prisma.membership.count({
        where: { userId: currentUser.sub },
      }),
    ]);

    const connectedPlatforms = [
      ...new Set(
        connections.data
          .filter((c) => c.status === ConnectionStatus.ACTIVE)
          .map((c) => c.platform)
          .filter((platform) => platform !== PlatformType.TIKTOK),
      ),
    ];

    return {
      totalOrganizations,
      activeOrganizationId: org.id,
      activeOrganizationName: org.name,
      connectedPlatforms,
    };
  }

  private async getSynchronizationSummary(): Promise<SynchronizationSummaryDto> {
    // Legacy synchronization module is unwired — keep DTO shape for clients.
    return {
      lastSynchronization: null,
      campaignsSynced: 0,
      failedSyncs: 0,
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
    const [products, store, connectedStores] = await Promise.all([
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
      this.prisma.platformConnection.count({
        where: {
          organizationId: currentUser.organizationId,
          platform: PlatformType.SHOPIFY,
          deletedAt: null,
          status: ConnectionStatus.ACTIVE,
        },
      }),
    ]);

    return {
      products,
      collections: 0,
      storeConnected: Boolean(store) || connectedStores > 0,
      connectedStores,
    };
  }

  private async getAiSessionsSummary(
    currentUser: JwtPayload,
  ): Promise<AiSessionsSummaryDto> {
    const total = await this.prisma.aiSession.count({
      where: { organizationId: currentUser.organizationId },
    });

    return { total };
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
