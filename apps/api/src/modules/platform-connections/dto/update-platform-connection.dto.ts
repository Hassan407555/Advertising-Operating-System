import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

import { CreatePlatformConnectionDto } from './create-platform-connection.dto';

export class UpdatePlatformConnectionDto extends PartialType(
  CreatePlatformConnectionDto,
) {
  @ApiPropertyOptional({
    description: 'Required for optimistic locking',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  accountName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}