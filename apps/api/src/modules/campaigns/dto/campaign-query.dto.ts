import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  CampaignObjective,
  CampaignStatus,
  PlatformType,
} from '@prisma/client';

import {
  CAMPAIGN_ALLOWED_SORT_FIELDS,
  CAMPAIGN_DEFAULT_PAGE_SIZE,
  CAMPAIGN_MAX_PAGE_SIZE,
} from '../constants/campaign.constants';

import type { CampaignSortField } from '../constants/campaign.constants';

export class CampaignQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: CAMPAIGN_DEFAULT_PAGE_SIZE,
    default: CAMPAIGN_DEFAULT_PAGE_SIZE,
    maximum: CAMPAIGN_MAX_PAGE_SIZE,
  })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(CAMPAIGN_MAX_PAGE_SIZE)
  limit = CAMPAIGN_DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({
    description: 'Search by campaign name or slug',
    example: 'summer',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: CampaignStatus,
  })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({
    enum: CampaignObjective,
  })
  @IsOptional()
  @IsEnum(CampaignObjective)
  objective?: CampaignObjective;
  @ApiPropertyOptional({
  description: 'Filter by Ad Account',
})
@IsOptional()
@IsString()
adAccountId?: string;

@ApiPropertyOptional({
  description: 'Filter by platform',
  example: 'META',
})
@IsOptional()
@IsString()
platform?: PlatformType;

  @ApiPropertyOptional({
    description: 'Filter active/inactive campaigns',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: CAMPAIGN_ALLOWED_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(CAMPAIGN_ALLOWED_SORT_FIELDS)
  sortBy: CampaignSortField = 'createdAt';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}