import {
  CreativeAssetType,
  Prisma,
  StorageProvider,
} from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCreativeAssetsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  creativeId?: string;

  @IsOptional()
  @IsString()
  adId?: string;

  @IsOptional()
  @IsEnum(CreativeAssetType)
  assetType?: CreativeAssetType;

  @IsOptional()
  @IsEnum(StorageProvider)
  storageProvider?: StorageProvider;

  @IsOptional()
  @Type(() => Boolean)
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(Prisma.SortOrder)
  sortOrder?: Prisma.SortOrder = 'desc';
}