import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationSummaryDto {
  @ApiProperty({ description: 'Always 1 for JWT-scoped org context' })
  totalOrganizations!: number;

  @ApiProperty()
  activeOrganizationId!: string;

  @ApiProperty()
  activeOrganizationName!: string;

  @ApiProperty({ type: [String] })
  connectedPlatforms!: string[];
}

export class CampaignSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  draft!: number;

  @ApiProperty({
    description: 'Campaigns with a live (non-local) platform external ID',
  })
  published!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  paused!: number;

  @ApiProperty()
  archived!: number;
}

export class AdvertisingSummaryDto {
  @ApiProperty()
  metaCampaigns!: number;

  @ApiProperty()
  tiktokCampaigns!: number;
}

export class AutomationSummaryDto {
  @ApiProperty()
  totalWorkflowRuns!: number;

  @ApiProperty()
  running!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  failed!: number;
}

export class SynchronizationSummaryDto {
  @ApiPropertyOptional({ nullable: true })
  lastSynchronization!: string | null;

  @ApiProperty()
  campaignsSynced!: number;

  @ApiProperty()
  failedSyncs!: number;
}

export class AnalyticsSummaryDto {
  @ApiProperty()
  spend!: number;

  @ApiProperty()
  revenue!: number;

  @ApiProperty()
  impressions!: number;

  @ApiProperty()
  clicks!: number;

  @ApiPropertyOptional({ nullable: true })
  ctr!: number | null;

  @ApiPropertyOptional({ nullable: true })
  cpc!: number | null;

  @ApiPropertyOptional({ nullable: true })
  cpm!: number | null;

  @ApiProperty()
  conversions!: number;

  @ApiPropertyOptional({ nullable: true })
  roas!: number | null;
}

export class AssetsSummaryDto {
  @ApiProperty()
  images!: number;

  @ApiProperty()
  videos!: number;

  @ApiProperty()
  totalAssets!: number;
}

export class ShopifySummaryDto {
  @ApiProperty()
  products!: number;

  @ApiProperty({
    description: 'Collections are not modeled yet; always 0 in V1',
  })
  collections!: number;

  @ApiProperty()
  storeConnected!: boolean;
}

export class PlatformConnectionSummaryDto {
  @ApiProperty()
  connected!: boolean;

  @ApiProperty({
    description: 'ACTIVE | EXPIRED | REVOKED | MISSING | INACTIVE',
  })
  tokenStatus!: string;

  @ApiPropertyOptional({ nullable: true })
  connectionStatus!: string | null;

  @ApiPropertyOptional({ nullable: true })
  accountName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastSyncedAt!: string | null;
}

export class PlatformsSummaryDto {
  @ApiProperty({ type: PlatformConnectionSummaryDto })
  meta!: PlatformConnectionSummaryDto;

  @ApiProperty({ type: PlatformConnectionSummaryDto })
  tiktok!: PlatformConnectionSummaryDto;
}

export class RecentCampaignItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  platform?: string | null;

  @ApiProperty()
  updatedAt!: string;
}

export class RecentAutomationRunItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  pipelineId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  triggerType!: string;

  @ApiPropertyOptional({ nullable: true })
  startedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class RecentPublishJobItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  campaignId!: string;

  @ApiProperty()
  platform!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  dryRun!: boolean;

  @ApiPropertyOptional({ nullable: true })
  startedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class RecentSynchronizationItemDto {
  @ApiProperty()
  campaignId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  externalStatus!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastSyncedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastSuccessfulSyncAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastFailedSyncAt!: string | null;
}

export class RecentActivityDto {
  @ApiProperty({ type: [RecentCampaignItemDto] })
  campaigns!: RecentCampaignItemDto[];

  @ApiProperty({ type: [RecentAutomationRunItemDto] })
  automationRuns!: RecentAutomationRunItemDto[];

  @ApiProperty({ type: [RecentPublishJobItemDto] })
  publishJobs!: RecentPublishJobItemDto[];

  @ApiProperty({ type: [RecentSynchronizationItemDto] })
  synchronizations!: RecentSynchronizationItemDto[];
}

export class DashboardSummaryDto {
  @ApiProperty({ type: OrganizationSummaryDto })
  organization!: OrganizationSummaryDto;

  @ApiProperty({ type: CampaignSummaryDto })
  campaigns!: CampaignSummaryDto;

  @ApiProperty({ type: AdvertisingSummaryDto })
  advertising!: AdvertisingSummaryDto;

  @ApiProperty({ type: AutomationSummaryDto })
  automation!: AutomationSummaryDto;

  @ApiProperty({ type: SynchronizationSummaryDto })
  synchronization!: SynchronizationSummaryDto;

  @ApiProperty({ type: AnalyticsSummaryDto })
  analytics!: AnalyticsSummaryDto;

  @ApiProperty({ type: AssetsSummaryDto })
  assets!: AssetsSummaryDto;

  @ApiProperty({ type: ShopifySummaryDto })
  shopify!: ShopifySummaryDto;

  @ApiProperty({ type: PlatformsSummaryDto })
  platforms!: PlatformsSummaryDto;

  @ApiProperty({ type: RecentActivityDto })
  recent!: RecentActivityDto;
}
