import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  CreativeAssetType,
} from '@prisma/client';

import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UploadFileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  directory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creativeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adId?: string;

  @ApiPropertyOptional({
    enum: CreativeAssetType,
    default: CreativeAssetType.IMAGE,
  })
  @IsOptional()
  @IsEnum(CreativeAssetType)
  assetType?: CreativeAssetType;

 @ApiPropertyOptional({
  default: false,
})
@IsOptional()
@Transform(({ value }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return String(value).toLowerCase() === 'true';
})
@IsBoolean()
isPrimary?: boolean;
}