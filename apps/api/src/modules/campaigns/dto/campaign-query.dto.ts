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
  CAMPAIGN_SORT_FIELDS,
  DEFAULT_LIMIT,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  MAX_LIMIT,
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
    example: DEFAULT_LIMIT,
    default: DEFAULT_LIMIT,
    maximum: MAX_LIMIT,
  })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(MAX_LIMIT)
  limit = DEFAULT_LIMIT;

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
    description: 'Filter by Ad Account ID',
  })
  @IsOptional()
  @IsString()
  adAccountId?: string;

  @ApiPropertyOptional({
    enum: PlatformType,
    description: 'Filter by advertising platform',
  })
  @IsOptional()
  @IsEnum(PlatformType)
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
    enum: CAMPAIGN_SORT_FIELDS,
    default: DEFAULT_SORT_BY,
  })
  @IsOptional()
  @IsIn(CAMPAIGN_SORT_FIELDS)
  sortBy: CampaignSortField = DEFAULT_SORT_BY;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: DEFAULT_SORT_ORDER,
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = DEFAULT_SORT_ORDER;
}