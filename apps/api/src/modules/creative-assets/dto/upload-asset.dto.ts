import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { CreativeAssetType } from '@prisma/client';

export class UploadAssetDto {
  @IsEnum(CreativeAssetType)
  assetType: CreativeAssetType;

  @IsOptional()
  @IsUUID()
  creativeId?: string;

  @IsOptional()
  @IsUUID()
  adId?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean = false;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number = 0;

  @IsOptional()
  @IsString()
  directory?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}