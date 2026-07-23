import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CallToAction,
  CreativeType,
} from '@prisma/client';

export class CreativeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional()
  externalId?: string;

  @ApiPropertyOptional()
  externalName?: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    enum: CreativeType,
  })
  type: CreativeType;

  @ApiPropertyOptional()
  headline?: string;

  @ApiPropertyOptional()
  primaryText?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: CallToAction,
  })
  callToAction?: CallToAction;

  @ApiPropertyOptional()
  landingPageUrl?: string;

  @ApiPropertyOptional()
  deepLinkUrl?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  archivedAt?: Date;

  @ApiPropertyOptional()
  lastSyncedAt?: Date;

  @ApiPropertyOptional()
  lastSuccessfulSyncAt?: Date;

  @ApiPropertyOptional()
  lastFailedSyncAt?: Date;

  @ApiPropertyOptional({
    type: Object,
  })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    type: [String],
  })
  tags?: string[];

  @ApiProperty()
  version: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}