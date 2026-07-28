import { ApiProperty } from '@nestjs/swagger';

import {
  CampaignBuyingType,
  CampaignObjective,
  CampaignStatus,
  Currency,
  PlatformType,
} from '@prisma/client';

class OrganizationSummaryDto {
  @ApiProperty({
    example: 'clx123abc456',
  })
  id: string;

  @ApiProperty({
    example: 'Acme Inc.',
  })
  name: string;
}

class AdAccountSummaryDto {
  @ApiProperty({
    example: 'clx789xyz123',
  })
  id: string;

  @ApiProperty({
    example: 'Meta Ads Account',
  })
  accountName: string;

  @ApiProperty({
    enum: PlatformType,
    example: PlatformType.META,
  })
  platform: PlatformType;

  @ApiProperty({
    example: 'act_123456789',
  })
  externalId: string;

  @ApiProperty({
    enum: Currency,
    example: Currency.USD,
  })
  currency: Currency;

  @ApiProperty({
    example: 'America/New_York',
  })
  timezone: string;

  @ApiProperty({
    example: true,
  })
  isActive: boolean;
}

export class CampaignResponseDto {
  @ApiProperty({
    example: 'clx123abc456',
  })
  id: string;

  @ApiProperty({
    example: 'org123',
  })
  organizationId: string;

  @ApiProperty({
    example: 'account123',
  })
  adAccountId: string;

  @ApiProperty({
    example: '120987654321',
  })
  externalId: string;

  @ApiProperty({
    nullable: true,
    example: 'Summer Sale Campaign (Meta)',
  })
  externalName: string | null;

  @ApiProperty({
    nullable: true,
    example: 'ACTIVE',
  })
  externalStatus: string | null;

  @ApiProperty({
    example: 'Summer Sale Campaign',
  })
  name: string;

  @ApiProperty({
    example: 'summer-sale-campaign',
    nullable: true,
  })
  slug: string | null;

  @ApiProperty({
    enum: CampaignObjective,
    example: CampaignObjective.SALES,
  })
  objective: CampaignObjective;

  @ApiProperty({
    enum: CampaignBuyingType,
    example: CampaignBuyingType.AUCTION,
  })
  buyingType: CampaignBuyingType;

  @ApiProperty({
    enum: CampaignStatus,
    example: CampaignStatus.ACTIVE,
  })
  status: CampaignStatus;

  @ApiProperty({
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    enum: Currency,
    example: Currency.USD,
  })
  currency: Currency;

  @ApiProperty({
    example: '100.00',
    nullable: true,
  })
  dailyBudget: string | null;

  @ApiProperty({
    example: '3000.00',
    nullable: true,
  })
  lifetimeBudget: string | null;

  @ApiProperty({
    example: '2026-07-01T00:00:00.000Z',
    nullable: true,
  })
  startDate: Date | null;

  @ApiProperty({
    example: '2026-07-31T23:59:59.000Z',
    nullable: true,
  })
  endDate: Date | null;

  @ApiProperty({
    example: 1,
  })
  version: number;

  @ApiProperty({
    nullable: true,
    example: '2026-08-01T00:00:00.000Z',
  })
  archivedAt: Date | null;

  @ApiProperty({
    nullable: true,
    example: null,
  })
  deletedAt: Date | null;

  @ApiProperty({
    example: '2026-07-20T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-07-21T15:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    type: OrganizationSummaryDto,
    required: false,
  })
  organization?: OrganizationSummaryDto;

  @ApiProperty({
    type: AdAccountSummaryDto,
    required: false,
  })
  adAccount?: AdAccountSummaryDto;

  @ApiProperty({
    description: 'AI draft provenance when campaign was saved from an AI session',
    required: false,
    nullable: true,
    example: 'ai-session',
  })
  source?: string | null;

  @ApiProperty({
    description: 'AI campaign type (IMAGE | CAROUSEL | VIDEO) when from AI draft',
    required: false,
    nullable: true,
    example: 'IMAGE',
  })
  campaignType?: string | null;

  @ApiProperty({
    description: 'Linked AI session ID when from AI draft',
    required: false,
    nullable: true,
  })
  aiSessionId?: string | null;

  @ApiProperty({
    description: 'Shopify store summary when from AI draft',
    required: false,
    nullable: true,
  })
  store?: { id: string; name: string } | null;

  @ApiProperty({
    description: 'Shopify product summary when from AI draft',
    required: false,
    nullable: true,
  })
  product?: { id: string; title: string } | null;
}