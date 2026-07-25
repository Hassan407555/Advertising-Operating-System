import {
  IsEnum,
  IsJSON,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  PlatformType,
  ReportFormat,
  ReportLevel,
} from '@prisma/client';

export class CreateReportDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(ReportLevel)
  level: ReportLevel;

  @IsEnum(PlatformType)
  @IsOptional()
  platform?: PlatformType;

  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsOptional()
  @IsJSON()
  filters?: string;

  @IsOptional()
  @IsJSON()
  columns?: string;
}