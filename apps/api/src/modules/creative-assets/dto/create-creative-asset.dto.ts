import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
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
  @ApiPropertyOptional({
    description: 'Associated Creative ID',
    example: 'cmf4q8w0n0001g8jv2u8m1c7a',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  creativeId?: string;

  @ApiPropertyOptional({
    description: 'Associated Ad ID',
    example: 'cmf4q8w0n0001g8jv2u8m1c7b',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  adId?: string;

  @ApiProperty({
    enum: CreativeAssetType,
  })
  @IsEnum(CreativeAssetType)
  assetType!: CreativeAssetType;

  @ApiPropertyOptional({
    enum: StorageProvider,
    description:
      'Normally populated internally after upload.',
  })
  @IsOptional()
  @IsEnum(StorageProvider)
  storageProvider?: StorageProvider;

  @ApiProperty({
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalFileName!: string;

  @ApiProperty({
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  storageKey!: string;

  @ApiProperty()
  @IsUrl()
  @MaxLength(2000)
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  thumbnailUrl?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mimeType!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  extension!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  checksum?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({
    description: 'File size in bytes',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'Media duration in seconds',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    type: Object,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}