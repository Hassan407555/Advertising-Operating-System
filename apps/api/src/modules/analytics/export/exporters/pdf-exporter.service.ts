import { Injectable } from '@nestjs/common';

import { ExportFormat } from '../enums/export-format.enum';
import { AnalyticsExportData } from '../interfaces/analytics-export-data.interface';
import { AnalyticsExporter } from '../interfaces/analytics-exporter.interface';

import { PdfExportBase } from '../base/pdf-export.base';

@Injectable()
export class PdfExporterService
  extends PdfExportBase
  implements AnalyticsExporter
{
  supports(format: ExportFormat): boolean {
    return format === ExportFormat.PDF;
  }

  async export(
    data: AnalyticsExportData,
  ): Promise<Buffer> {
    const document = this.createDocument();

    this.addTitle(
      document,
      'Analytics Report',
    );

    this.addKeyValue(
      document,
      'Exported At',
      data.report.generatedAt
    );

    this.addKeyValue(
      document,
      'Filters',
      data.filters,
    );

    this.addSeparator(document);

    this.addSection(
      document,
      'Summary',
    );

    if (
      data.summary &&
      typeof data.summary === 'object'
    ) {
      for (const [key, value] of Object.entries(
        data.summary as Record<
          string,
          unknown
        >,
      )) {
        this.addKeyValue(
          document,
          key,
          value,
        );
      }
    }

    this.addSeparator(document);

    this.addSection(
      document,
      'Time Series',
    );

    if (
      Array.isArray(data.timeSeries) &&
      data.timeSeries.length > 0
    ) {
      const first =
        data.timeSeries[0] as Record<
          string,
          unknown
        >;

      const headers =
        Object.keys(first);

      const rows = data.timeSeries.map(
        (item) =>
          headers.map(
            (header) =>
              (
                item as Record<
                  string,
                  unknown
                >
              )[header],
          ),
      );

      this.addTable(
        document,
        headers,
        rows,
      );
    } else {
      document.text(
        'No time series data available.',
      );
    }

    this.renderBreakdown(
      document,
      'Campaign Breakdown',
      data.breakdown.campaigns,
    );

    this.renderBreakdown(
      document,
      'Ad Set Breakdown',
      data.breakdown.adSets,
    );

    this.renderBreakdown(
      document,
      'Ad Breakdown',
      data.breakdown.ads,
    );

    this.renderBreakdown(
      document,
      'Creative Breakdown',
      data.breakdown.creatives,
    );

    this.addFooter(document);

    return this.toBuffer(document);
  }

  private renderBreakdown(
    document: PDFKit.PDFDocument,
    title: string,
    rows: unknown,
  ): void {
    this.addSection(
      document,
      title,
    );

    if (
      !Array.isArray(rows) ||
      rows.length === 0
    ) {
      document.text(
        'No data available.',
      );

      return;
    }

    const first =
      rows[0] as Record<
        string,
        unknown
      >;

    const headers =
      Object.keys(first);

    const values = rows.map(
      (row) =>
        headers.map(
          (header) =>
            (
              row as Record<
                string,
                unknown
              >
            )[header],
        ),
    );

    this.addTable(
      document,
      headers,
      values,
    );
  }
}