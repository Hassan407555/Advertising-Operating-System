import { ApiProperty } from '@nestjs/swagger';
import {
  AdStatus,
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

class AdSetSummaryDto {
  @ApiProperty({
    example: 'clx789xyz123',
  })
  id: string;

  @ApiProperty({
    example: 'Prospecting Ad Set',
  })
  name: string;
}

class CreativeSummaryDto {
  @ApiProperty({
    example: 'clx456def789',
  })
  id: string;

  @ApiProperty({
    example: 'Summer Video Creative',
  })
  name: string;
}

export class AdResponseDto {
  @ApiProperty({
    example: 'clx123abc456',
  })
  id: string;

  @ApiProperty({
    example: 'org123',
  })
  organizationId: string;

  @ApiProperty({
    example: 'adset123',
  })
  adSetId: string;

  @ApiProperty({
    example: 'creative123',
    nullable: true,
  })
  creativeId: string | null;

  @ApiProperty({
    example: 'Summer Sale Ad',
  })
  name: string;

  @ApiProperty({
    enum: AdStatus,
    example: AdStatus.ACTIVE,
  })
  status: AdStatus;

  @ApiProperty({
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    example: {
      headline: 'Limited Time Offer',
      cta: 'Shop Now',
    },
    nullable: true,
  })
  metadata: Prisma.JsonValue | null;

  @ApiProperty({
    example: {
      category: 'summer',
      priority: 'high',
    },
    nullable: true,
  })
  tags: Prisma.JsonValue | null;

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
    type: AdSetSummaryDto,
    required: false,
  })
  adSet?: AdSetSummaryDto;

  @ApiProperty({
    type: CreativeSummaryDto,
    required: false,
  })
  creative?: CreativeSummaryDto;
}