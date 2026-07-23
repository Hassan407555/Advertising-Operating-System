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

import { AdStatus } from '@prisma/client';

import {
  AD_ALLOWED_SORT_FIELDS,
  AD_DEFAULT_PAGE_SIZE,
  AD_MAX_PAGE_SIZE,
} from '../constants/ad.constants';

import type { AdSortField } from '../constants/ad.constants';

export class AdQueryDto {
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
    example: AD_DEFAULT_PAGE_SIZE,
    default: AD_DEFAULT_PAGE_SIZE,
    maximum: AD_MAX_PAGE_SIZE,
  })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(AD_MAX_PAGE_SIZE)
  limit = AD_DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({
    description: 'Search by ad name',
    example: 'Summer Sale',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: AdStatus,
  })
  @IsOptional()
  @IsEnum(AdStatus)
  status?: AdStatus;

  @ApiPropertyOptional({
    description: 'Filter by Ad Set',
  })
  @IsOptional()
  @IsString()
  adSetId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Creative',
  })
  @IsOptional()
  @IsString()
  creativeId?: string;

  @ApiPropertyOptional({
    description: 'Filter active/inactive ads',
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
    enum: AD_ALLOWED_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(AD_ALLOWED_SORT_FIELDS)
  sortBy: AdSortField = 'createdAt';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}