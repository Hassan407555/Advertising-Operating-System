import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import {
  AdAccountStatus,
  Currency,
  PlatformType,
} from '@prisma/client';

export class CreateAdAccountDto {
  @ApiProperty({
    example: 'cmabcd123456789',
    description: 'Platform Connection ID',
  })
  @IsString()
  @IsNotEmpty()
  platformConnectionId: string;

  @ApiProperty({
    enum: PlatformType,
    example: PlatformType.META,
  })
  @IsEnum(PlatformType)
  platform: PlatformType;

  @ApiProperty({
    example: 'act_123456789',
    description: 'External Ad Account ID',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  externalId: string;

  @ApiPropertyOptional({
    example: 'Meta Business',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalName?: string;

  @ApiPropertyOptional({
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  externalStatus?: string;

  @ApiProperty({
    example: 'My Advertising Account',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  accountName: string;

  @ApiPropertyOptional({
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountNumber?: string;

  @ApiProperty({
    enum: Currency,
    example: Currency.USD,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({
    example: 'America/New_York',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  timezone: string;

  @ApiPropertyOptional({
    enum: AdAccountStatus,
    default: AdAccountStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(AdAccountStatus)
  status?: AdAccountStatus;

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 1250.75,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  spend?: number;

  @ApiPropertyOptional({
    example: 25000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  impressions?: number;

  @ApiPropertyOptional({
    example: 550,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  clicks?: number;

  @ApiPropertyOptional({
    example: 42.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  conversions?: number;

  @ApiPropertyOptional({
    type: Object,
    example: {
      businessId: '123456789',
      source: 'Meta Marketing API',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}