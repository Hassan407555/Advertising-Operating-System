import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { ReportFormat } from '@prisma/client';

export class ExportReportDto {
  @ApiProperty({
    enum: ReportFormat,
    example: ReportFormat.CSV,
  })
  @IsEnum(ReportFormat)
  format: ReportFormat;
}