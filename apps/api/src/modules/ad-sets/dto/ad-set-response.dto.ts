import { ApiProperty } from '@nestjs/swagger';
import {
  AdSetStatus,
  BillingEvent,
  Prisma,
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

class CampaignSummaryDto {
  @ApiProperty({
    example: 'clx789xyz123',
  })
  id: string;

  @ApiProperty({
    example: 'Summer Sale Campaign',
  })
  name: string;
}

export class AdSetResponseDto {
  @ApiProperty({
    example: 'clx123abc456',
  })
  id: string;

  @ApiProperty({
    example: 'org123',
  })
  organizationId: string;

  @ApiProperty({
    example: 'campaign123',
  })
  campaignId: string;

  @ApiProperty({
    example: 'Prospecting Ad Set',
  })
  name: string;

  @ApiProperty({
    enum: AdSetStatus,
    example: AdSetStatus.ACTIVE,
  })
  status: AdSetStatus;

  @ApiProperty({
    example: '50.00',
    nullable: true,
  })
  dailyBudget: string | null;

  @ApiProperty({
    example: '1500.00',
    nullable: true,
  })
  lifetimeBudget: string | null;

  @ApiProperty({
    example: '5.00',
    nullable: true,
  })
  bidAmount: string | null;

  @ApiProperty({
    enum: BillingEvent,
    required: false,
    nullable: true,
  })
  billingEvent: BillingEvent | null;

  @ApiProperty({
    example: {
      countries: ['US'],
      ageMin: 18,
      ageMax: 45,
    },
    nullable: true,
  })
    targeting: Prisma.JsonValue | null;

  @ApiProperty({
    example: true,
  })
  isActive: boolean;

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
    type: CampaignSummaryDto,
    required: false,
  })
  campaign?: CampaignSummaryDto;
}