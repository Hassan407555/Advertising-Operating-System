import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { PlatformType } from '@prisma/client';

export class CreatePlatformConnectionDto {
  @IsEnum(PlatformType)
  platform: PlatformType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  accountId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  accountName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalName?: string;

  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}