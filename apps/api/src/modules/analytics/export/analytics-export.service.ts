import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { AnalyticsBreakdownDto } from '../dto/analytics-breakdown.dto';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { AnalyticsService } from '../services/analytics.service';

import { ExportFormat } from './enums/export-format.enum';
import { AnalyticsExportData } from './interfaces/analytics-export-data.interface';

import { CsvExporterService } from './exporters/csv-exporter.service';
import { ExcelExporterService } from './exporters/excel-exporter.service';
import { PdfExporterService } from './exporters/pdf-exporter.service';

@Injectable()
export class AnalyticsExportService {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly csvExporter: CsvExporterService,
    private readonly excelExporter: ExcelExporterService,
    private readonly pdfExporter: PdfExporterService,
  ) {}

  async export(
    format: ExportFormat,
    query: AnalyticsQueryDto,
    currentUser: JwtPayload,
  ): Promise<Buffer> {
    const data = await this.buildExportData(
      query,
      currentUser,
    );

    switch (format) {
      case ExportFormat.CSV:
        return this.csvExporter.export(data);

      case ExportFormat.XLSX:
        return this.excelExporter.export(data);

      case ExportFormat.PDF:
        return this.pdfExporter.export(data);

      default:
        throw new BadRequestException(
          'Unsupported export format.',
        );
    }
  }

  private async buildExportData(
    query: AnalyticsQueryDto,
    currentUser: JwtPayload,
  ): Promise<AnalyticsExportData> {
    const [
      summary,
      timeSeries,
      campaigns,
      adSets,
      ads,
      creatives,
    ] = await Promise.all([
      this.analyticsService.getSummary(
        query,
        currentUser,
      ),

      this.analyticsService.getTimeSeries(
        query,
        currentUser,
      ),

      this.analyticsService.getBreakdown(
        {
          ...query,
          dimension: 'campaign',
        } as AnalyticsBreakdownDto,
        currentUser,
      ),

      this.analyticsService.getBreakdown(
        {
          ...query,
          dimension: 'adSet',
        } as AnalyticsBreakdownDto,
        currentUser,
      ),

      this.analyticsService.getBreakdown(
        {
          ...query,
          dimension: 'ad',
        } as AnalyticsBreakdownDto,
        currentUser,
      ),

      this.analyticsService.getBreakdown(
        {
          ...query,
          dimension: 'creative',
        } as AnalyticsBreakdownDto,
        currentUser,
      ),
    ]);

   return {
  report: {
    title: 'Advertising Operating System',
    generatedAt: new Date(),
    generatedBy:
      currentUser.email ??
      currentUser.sub ??
      'System',
    organization:
      currentUser.organizationId,
    workspace: 'Default',
    timezone: 'UTC',
    version: '1.0.0',
  },

  filters: {
    dateRange:
      query.startDate && query.endDate
        ? `${query.startDate} - ${query.endDate}`
        : 'All Time',

    groupBy: undefined,

    sortBy: query.sortBy,

    sortOrder: query.sortOrder,
  },

  summary,

  timeSeries,

  breakdown: {
    campaigns,
    adSets,
    ads,
    creatives,
  },
};
  }
}