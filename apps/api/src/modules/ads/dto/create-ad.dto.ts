import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { AdStatus } from '@prisma/client';

export class CreateAdDto {
  @IsString()
  @IsNotEmpty()
  adSetId: string;

  @IsOptional()
  @IsString()
  creativeId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsEnum(AdStatus)
  status?: AdStatus = AdStatus.DRAFT;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  tags?: Record<string, any>;
}