import {
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  CreativeAssetType,
  Prisma,
  StorageProvider,
} from '@prisma/client';
import {
  Transform,
  Type,
} from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  CREATIVE_ASSET_SORT_FIELDS,
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  MAX_LIMIT,
} from '../constants/creative-assets.constants';

export class QueryCreativeAssetsDto {
  @ApiPropertyOptional({
    example: DEFAULT_PAGE,
    minimum: 1,
    default: DEFAULT_PAGE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    example: DEFAULT_LIMIT,
    minimum: 1,
    maximum: MAX_LIMIT,
    default: DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description: 'Search by file name, original file name, storage key or URL.',
    example: 'banner',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by Creative ID',
    example: 'cmf4q8w0n0001g8jv2u8m1c7a',
  })
  @IsOptional()
  @IsString()
  creativeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Ad ID',
    example: 'cmf4q8w0n0001g8jv2u8m1c7b',
  })
  @IsOptional()
  @IsString()
  adId?: string;

  @ApiPropertyOptional({
    enum: CreativeAssetType,
  })
  @IsOptional()
  @IsEnum(CreativeAssetType)
  assetType?: CreativeAssetType;

  @ApiPropertyOptional({
    enum: StorageProvider,
  })
  @IsOptional()
  @IsEnum(StorageProvider)
  storageProvider?: StorageProvider;

  @ApiPropertyOptional({
    description: 'Filter primary assets only.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    enum: CREATIVE_ASSET_SORT_FIELDS,
    default: DEFAULT_SORT_BY,
  })
  @IsOptional()
  @IsIn(CREATIVE_ASSET_SORT_FIELDS)
  sortBy: (typeof CREATIVE_ASSET_SORT_FIELDS)[number] =
    DEFAULT_SORT_BY;

  @ApiPropertyOptional({
    enum: Prisma.SortOrder,
    default: DEFAULT_SORT_ORDER,
  })
  @IsOptional()
  @IsEnum(Prisma.SortOrder)
  sortOrder: Prisma.SortOrder =
    DEFAULT_SORT_ORDER;
}