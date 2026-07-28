import { Injectable } from '@nestjs/common';

import ExcelJS from 'exceljs';

import { ExportFormat } from '../enums/export-format.enum';
import { AnalyticsExportData } from '../interfaces/analytics-export-data.interface';
import { AnalyticsExporter } from '../interfaces/analytics-exporter.interface';

@Injectable()
export class ExcelExporterService
  implements AnalyticsExporter
{
  supports(
    format: ExportFormat,
  ): boolean {
    return format === ExportFormat.XLSX;
  }

  async export(
    data: AnalyticsExportData,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    workbook.creator =
      'AI Meta Ads Studio';

    workbook.created = new Date();

    this.createSummarySheet(
      workbook,
      data,
    );

    this.createTimeSeriesSheet(
      workbook,
      data,
    );

    this.createBreakdownSheet(
      workbook,
      'Campaigns',
      data.breakdown.campaigns,
    );

    this.createBreakdownSheet(
      workbook,
      'Ad Sets',
      data.breakdown.adSets,
    );

    this.createBreakdownSheet(
      workbook,
      'Ads',
      data.breakdown.ads,
    );

    this.createBreakdownSheet(
      workbook,
      'Creatives',
      data.breakdown.creatives,
    );

    const buffer =
      await workbook.xlsx.writeBuffer();

    return Buffer.from(buffer);
  }

  private createSummarySheet(
    workbook: ExcelJS.Workbook,
    data: AnalyticsExportData,
  ): void {
    const sheet =
      workbook.addWorksheet('Summary');

    sheet.columns = [
      {
        header: 'Metric',
        key: 'metric',
        width: 35,
      },
      {
        header: 'Value',
        key: 'value',
        width: 25,
      },
    ];

    this.styleHeader(sheet);

    Object.entries(
      data.summary as Record<
        string,
        unknown
      >,
    ).forEach(([metric, value]) => {
      sheet.addRow({
        metric,
        value,
      });
    });

    sheet.views = [
      {
        state: 'frozen',
        ySplit: 1,
      },
    ];
  }

  private createTimeSeriesSheet(
    workbook: ExcelJS.Workbook,
    data: AnalyticsExportData,
  ): void {
    const sheet =
      workbook.addWorksheet(
        'Time Series',
      );

    const rows =
      data.timeSeries as Record<
        string,
        unknown
      >[];

    if (!rows.length) {
      return;
    }

    sheet.columns = Object.keys(
      rows[0],
    ).map((key) => ({
      header: key,
      key,
      width: 18,
    }));

    this.styleHeader(sheet);

    rows.forEach((row) => {
      sheet.addRow(row);
    });

    sheet.views = [
      {
        state: 'frozen',
        ySplit: 1,
      },
    ];

    sheet.autoFilter = {
      from: 'A1',
      to: `${String.fromCharCode(
        64 + sheet.columnCount,
      )}1`,
    };
  }

  private createBreakdownSheet(
    workbook: ExcelJS.Workbook,
    title: string,
    data: unknown,
  ): void {
    const sheet =
      workbook.addWorksheet(title);

    if (
      !Array.isArray(data) ||
      !data.length
    ) {
      return;
    }

    const rows =
      data as Record<
        string,
        unknown
      >[];

    sheet.columns = Object.keys(
      rows[0],
    ).map((key) => ({
      header: key,
      key,
      width: 20,
    }));

    this.styleHeader(sheet);

    rows.forEach((row) => {
      sheet.addRow(row);
    });

    sheet.views = [
      {
        state: 'frozen',
        ySplit: 1,
      },
    ];

    sheet.autoFilter = {
      from: 'A1',
      to: `${String.fromCharCode(
        64 + sheet.columnCount,
      )}1`,
    };
  }

  private styleHeader(
    sheet: ExcelJS.Worksheet,
  ): void {
    const header = sheet.getRow(1);

    header.font = {
      bold: true,
    };

    header.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
  }
}