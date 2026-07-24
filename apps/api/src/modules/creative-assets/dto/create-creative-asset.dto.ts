import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

import {
  CreativeAssetType,
  StorageProvider,
} from '@prisma/client';

export class CreateCreativeAssetDto {
  @IsString()
  @IsNotEmpty()
  creativeId!: string;

  @IsOptional()
  @IsString()
  adId?: string;

  @IsEnum(CreativeAssetType)
  assetType!: CreativeAssetType;

  @IsEnum(StorageProvider)
  storageProvider!: StorageProvider;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalFileName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  storageKey!: string;

  @IsUrl()
  @MaxLength(2000)
  url!: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  thumbnailUrl?: string;

  @IsString()
  @MaxLength(255)
  mimeType!: string;

  @IsString()
  @MaxLength(20)
  extension!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  checksum?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @IsOptional()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}