import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
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
  ReportFormat,
  ReportLevel,
  PlatformType,
} from '@prisma/client';

import {
  DEFAULT_SORT_BY,
  REPORT_SORT_FIELDS,
  type ReportSortField,
} from '../constants/reporting.constants';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'desc';

export class ReportQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
  })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ReportLevel,
  })
  @IsOptional()
  @IsEnum(ReportLevel)
  level?: ReportLevel;

  @ApiPropertyOptional({
    enum: ReportFormat,
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
  enum: PlatformType,
})
    @IsOptional()
    @IsEnum(PlatformType)
    platform?: PlatformType;

  @ApiPropertyOptional({
    enum: REPORT_SORT_FIELDS,
    default: DEFAULT_SORT_BY,
  })
  @IsOptional()
  @IsIn(REPORT_SORT_FIELDS)
  sortBy: ReportSortField = DEFAULT_SORT_BY;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: DEFAULT_SORT_ORDER,
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = DEFAULT_SORT_ORDER;
}