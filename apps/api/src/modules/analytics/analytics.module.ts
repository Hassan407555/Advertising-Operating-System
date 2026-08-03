import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { AnalyticsController } from './controllers/analytics.controller';

import { AnalyticsExportService } from './export/analytics-export.service';
import { CsvExporterService } from './export/exporters/csv-exporter.service';
import { ExcelExporterService } from './export/exporters/excel-exporter.service';
import { PdfExporterService } from './export/exporters/pdf-exporter.service';

import { AnalyticsMapper } from './mappers/analytics.mapper';

import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsMapper,
    AnalyticsService,
    AnalyticsExportService,
    CsvExporterService,
    ExcelExporterService,
    PdfExporterService,
  ],
  exports: [AnalyticsService, AnalyticsExportService],
})
export class AnalyticsModule {}
