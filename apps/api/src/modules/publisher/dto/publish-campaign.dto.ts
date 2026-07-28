import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { PublisherPlatform } from '../enums/publisher.enums';

export class PublishEntityIdsDto {
  @ApiPropertyOptional({
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adSetIds?: string[];

  @ApiPropertyOptional({
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adIds?: string[];

  @ApiPropertyOptional({
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  creativeIds?: string[];
}

export class PublishCampaignDto {
  @ApiProperty({
    example: 'clxcampaign123',
  })
  @IsString()
  @IsNotEmpty()
  campaignId!: string;

  @ApiProperty({
    example: 'clxorg123',
    description:
      'Organization ID. Must match the authenticated user organization.',
  })
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @ApiProperty({
    enum: PublisherPlatform,
    example: PublisherPlatform.META,
  })
  @IsEnum(PublisherPlatform)
  platform!: PublisherPlatform;

  @ApiProperty({
    example: 'clxadaccount123',
    description: 'Ad account to publish into for the selected platform.',
  })
  @IsString()
  @IsNotEmpty()
  adAccountId!: string;

  @ApiPropertyOptional({
    type: PublishEntityIdsDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PublishEntityIdsDto)
  entityIds?: PublishEntityIdsDto;

  @ApiPropertyOptional({
    type: Object,
    description: 'Opaque provider-specific options.',
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}
