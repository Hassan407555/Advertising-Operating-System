import { ApiProperty } from '@nestjs/swagger';

import {
  CampaignObjective,
  CampaignStatus,
  CampaignBuyingType,
  PlatformType,
  Currency,
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
}