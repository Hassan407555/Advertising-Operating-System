import {
  AnalyticsLevel,
  PlatformType,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { Transform, Type } from 'class-transformer';

import {
  ANALYTICS_SORT_FIELDS,
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  MAX_LIMIT,
  type AnalyticsSortField,
} from '../constants/analytics.constants';

export class AnalyticsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = DEFAULT_PAGE;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  @IsOptional()
  limit: number = DEFAULT_LIMIT;

  @IsOptional()
  @IsEnum(PlatformType)
  platform?: PlatformType;

  @IsOptional()
  @IsEnum(AnalyticsLevel)
  level?: AnalyticsLevel;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  adSetId?: string;

  @IsOptional()
  @IsString()
  adId?: string;

  @IsOptional()
  @IsString()
  creativeId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  // ==========================
  // Time Series
  // ==========================

  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase())
  @IsIn(['hour', 'day', 'week', 'month'])
  groupBy: 'hour' | 'day' | 'week' | 'month' = 'day';

  @IsOptional()
  @IsIn(ANALYTICS_SORT_FIELDS)
  sortBy: AnalyticsSortField = DEFAULT_SORT_BY;

  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase())
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = DEFAULT_SORT_ORDER;
}