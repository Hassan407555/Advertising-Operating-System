import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AiSessionMessageRole,
  AiSessionSource,
  AiSessionStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateAiSessionDto {
  @ApiProperty({ description: 'Shopify store id (PlatformConnection id)' })
  @IsString()
  @IsNotEmpty()
  storeId!: string;

  @ApiProperty({ description: 'Shopify product id' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiPropertyOptional({
    enum: AiSessionSource,
    description:
      'Entry point for analytics. Defaults to PRODUCT_PAGE. Prefer Advertising Entry for product UX.',
    default: AiSessionSource.PRODUCT_PAGE,
  })
  @IsOptional()
  @IsEnum(AiSessionSource)
  sessionSource?: AiSessionSource;
}

export class AdvanceAiSessionDto {
  @ApiPropertyOptional({
    description: 'Answer for the current interview step',
  })
  @IsOptional()
  @IsString()
  value?: string;
}

export class SaveAiSessionDraftDto {
  @ApiProperty({
    description:
      'Reviewed/edited generated campaign payload (Image, Carousel, or Video shape). Must match session campaign type.',
    type: Object,
  })
  @IsObject()
  payload!: Record<string, unknown>;
}

export class ListAiSessionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ enum: AiSessionStatus })
  @IsOptional()
  @IsEnum(AiSessionStatus)
  status?: AiSessionStatus;
}

export class AiSessionMessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AiSessionMessageRole })
  role!: AiSessionMessageRole;

  @ApiProperty()
  content!: string;

  @ApiPropertyOptional({ nullable: true })
  stepKey!: string | null;

  @ApiPropertyOptional({ nullable: true })
  metadata!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;
}

export class AiSessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  shopifyStoreId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty({ enum: AiSessionSource })
  sessionSource!: AiSessionSource;

  @ApiProperty({ enum: AiSessionStatus })
  status!: AiSessionStatus;

  @ApiProperty()
  currentManager!: string;

  @ApiProperty()
  currentPhase!: string;

  @ApiProperty()
  workflowMetadata!: Record<string, unknown>;

  @ApiProperty()
  workflowContext!: Record<string, unknown>;

  @ApiProperty()
  workflowVersion!: string;

  @ApiProperty()
  promptVersions!: Record<string, string>;

  @ApiPropertyOptional({ nullable: true })
  errorMessage!: string | null;

  @ApiProperty()
  lastActivityAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  cancelledAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: [AiSessionMessageResponseDto] })
  messages?: AiSessionMessageResponseDto[];

  @ApiPropertyOptional()
  reusedExisting?: boolean;
}
