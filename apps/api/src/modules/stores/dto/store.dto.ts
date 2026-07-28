import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertStoreAdvertisingConfigurationDto {
  @ApiPropertyOptional({
    description: 'Meta PlatformConnection id for this store',
  })
  @IsOptional()
  @IsString()
  metaPlatformConnectionId?: string | null;

  @ApiPropertyOptional({
    description: 'External Meta Business Manager ID',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaBusinessId?: string | null;

  @ApiPropertyOptional({
    description: 'Local AdAccount id selected for this store',
  })
  @IsOptional()
  @IsString()
  adAccountId?: string | null;

  @ApiPropertyOptional({
    description: 'External Facebook Page ID',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  facebookPageId?: string | null;

  @ApiPropertyOptional({
    description: 'External Instagram account ID',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  instagramAccountId?: string | null;

  @ApiPropertyOptional({
    description: 'External Meta Pixel ID',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pixelId?: string | null;

  @ApiPropertyOptional({
    description: 'External Meta Product Catalog ID',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  catalogId?: string | null;
}

export class StoreAdvertisingConfigurationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  shopifyStoreId: string;

  @ApiPropertyOptional({ nullable: true })
  metaPlatformConnectionId: string | null;

  @ApiPropertyOptional({ nullable: true })
  metaBusinessId: string | null;

  @ApiPropertyOptional({ nullable: true })
  adAccountId: string | null;

  @ApiPropertyOptional({ nullable: true })
  facebookPageId: string | null;

  @ApiPropertyOptional({ nullable: true })
  instagramAccountId: string | null;

  @ApiPropertyOptional({ nullable: true })
  pixelId: string | null;

  @ApiPropertyOptional({ nullable: true })
  catalogId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class StoreCapabilitiesDto {
  @ApiProperty()
  shopifyConnected: boolean;

  @ApiProperty()
  metaConnected: boolean;

  @ApiProperty()
  productsSynced: boolean;

  @ApiProperty()
  productCount: number;

  @ApiPropertyOptional({ nullable: true })
  lastSyncAt: string | null;

  @ApiProperty()
  adAccountSelected: boolean;

  @ApiProperty()
  facebookPageSelected: boolean;

  @ApiProperty()
  instagramSelected: boolean;

  @ApiProperty()
  pixelSelected: boolean;

  @ApiProperty()
  catalogSelected: boolean;
}

export class StoreHealthDto {
  @ApiProperty({ enum: ['HEALTHY', 'NEEDS_ATTENTION', 'NOT_READY'] })
  status: 'HEALTHY' | 'NEEDS_ATTENTION' | 'NOT_READY';

  @ApiProperty({ type: [String] })
  reasons: string[];
}

export class StoreSummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  shopDomain: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  syncStatus: string;

  @ApiPropertyOptional({ nullable: true })
  lastSyncedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastSuccessfulSyncAt: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ type: StoreCapabilitiesDto })
  capabilities: StoreCapabilitiesDto;

  @ApiProperty({
    description: 'Computed advertising readiness — never stored',
  })
  advertisingReady: boolean;

  @ApiProperty({ type: StoreHealthDto })
  health: StoreHealthDto;
}

export class StoreIdParamDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  storeId!: string;
}

export class ListStoreProductsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class AdvertisingEligibilityDto {
  @ApiProperty({
    description: 'Whether the store can start or resume AI advertising work',
  })
  eligible!: boolean;

  @ApiProperty({
    type: [String],
    description: 'Blocking reasons when not eligible (empty when eligible)',
  })
  reasons!: string[];
}

export class StoreProductResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  externalId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  handle!: string;

  @ApiPropertyOptional({ nullable: true })
  vendor!: string | null;

  @ApiPropertyOptional({ nullable: true })
  productType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiPropertyOptional({ nullable: true })
  featuredImageUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastSyncedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({
    description:
      'Backend-computed: store is advertising-ready and product can be advertised',
  })
  canAdvertise!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Active AI session id for this product, if one exists',
  })
  activeSessionId!: string | null;
}

export class StoreProductsListResponseDto {
  @ApiProperty({ type: [StoreProductResponseDto] })
  data!: StoreProductResponseDto[];

  @ApiProperty()
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  @ApiProperty({ type: AdvertisingEligibilityDto })
  advertisingEligibility!: AdvertisingEligibilityDto;
}

export class StartAdvertisingEntryDto {
  @ApiProperty({ description: 'Shopify product id belonging to this store' })
  @IsString()
  @IsNotEmpty()
  productId!: string;
}
