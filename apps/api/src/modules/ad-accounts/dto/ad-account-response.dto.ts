import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdAccountStatus,
  Currency,
  PlatformType,
} from '@prisma/client';

export class AdAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  platformConnectionId: string;

  @ApiProperty({
    enum: PlatformType,
  })
  platform: PlatformType;

  @ApiProperty()
  externalId: string;

  @ApiPropertyOptional()
  externalName?: string | null;

  @ApiPropertyOptional()
  externalStatus?: string | null;

  @ApiProperty()
  accountName: string;

  @ApiPropertyOptional()
  accountNumber?: string | null;

  @ApiProperty({
    enum: Currency,
  })
  currency: Currency;

  @ApiProperty()
  timezone: string;

  @ApiProperty({
    enum: AdAccountStatus,
  })
  status: AdAccountStatus;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional({
    example: 1525.75,
  })
  spend?: number | null;

  @ApiPropertyOptional({
    example: 150000,
  })
  impressions?: number | null;

  @ApiPropertyOptional({
    example: 2850,
  })
  clicks?: number | null;

  @ApiPropertyOptional({
    example: 43.25,
  })
  conversions?: number | null;

  @ApiPropertyOptional()
  lastSyncedAt?: Date | null;

  @ApiPropertyOptional()
  lastSuccessfulSyncAt?: Date | null;

  @ApiPropertyOptional()
  lastFailedSyncAt?: Date | null;

  @ApiPropertyOptional({
    type: Object,
  })
  metadata?: Record<string, any> | null;

  @ApiProperty()
  version: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}