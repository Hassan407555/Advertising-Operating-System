import { Injectable } from '@nestjs/common';
import { format } from '@fast-csv/format';

import { ExportFormat } from '../enums/export-format.enum';
import { AnalyticsExportData } from '../interfaces/analytics-export-data.interface';
import { AnalyticsExporter } from '../interfaces/analytics-exporter.interface';

@Injectable()
export class CsvExporterService
  implements AnalyticsExporter
{
  supports(format: ExportFormat): boolean {
    return format === ExportFormat.CSV;
  }

  async export(
    data: AnalyticsExportData,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const csv = format({
        headers: false,
      });

      csv.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      csv.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      csv.on('error', reject);

      this.writeHeader(csv, data);
      this.writeSummary(csv, data);
      this.writeTimeSeries(csv, data);

      this.writeBreakdown(
        csv,
        'Campaign Breakdown',
        data.breakdown.campaigns,
      );

      this.writeBreakdown(
        csv,
        'Ad Set Breakdown',
        data.breakdown.adSets,
      );

      this.writeBreakdown(
        csv,
        'Ad Breakdown',
        data.breakdown.ads,
      );

      this.writeBreakdown(
        csv,
        'Creative Breakdown',
        data.breakdown.creatives,
      );

      csv.write([
        '============================================================',
      ]);
      csv.write([
        'End of Report',
      ]);

      csv.end();
    });
  }

  private writeHeader(
    csv: ReturnType<typeof format>,
    data: AnalyticsExportData,
  ): void {
    csv.write([
      '============================================================',
    ]);

    csv.write([
      'AI Meta Ads Studio',
    ]);

    csv.write([
      'Analytics Report',
    ]);

    csv.write([
      '============================================================',
    ]);

    csv.write([]);

   csv.write([
  'Generated At',
  this.formatValue(
    data.report.generatedAt,
  ),
]);

    csv.write([]);

    csv.write([
      '============================================================',
    ]);

    csv.write([
      'APPLIED FILTERS',
    ]);

    csv.write([
      '============================================================',
    ]);

    csv.write([]);

    csv.write([
      'Filter',
      'Value',
    ]);

   Object.entries(
  data.filters as unknown as Record<
    string,
    unknown
  >,
).forEach(([key, value]) => {
      csv.write([
        this.humanize(key),
        this.formatValue(value),
      ]);
    });

    csv.write([]);
  }
    private writeSummary(
    csv: ReturnType<typeof format>,
    data: AnalyticsExportData,
  ): void {
    csv.write([
      '============================================================',
    ]);

    csv.write([
      'EXECUTIVE SUMMARY',
    ]);

    csv.write([
      '============================================================',
    ]);

    csv.write([]);

    csv.write([
      'Metric',
      'Value',
    ]);

    Object.entries(
      data.summary as Record<string, unknown>,
    ).forEach(([key, value]) => {
      csv.write([
        this.humanize(key),
        this.formatValue(value),
      ]);
    });

    csv.write([]);
  }

  private humanize(value: string): string {
    return value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      );
  }

  private formatValue(
    value: unknown,
  ): unknown {
    if (
      value === null ||
      value === undefined
    ) {
      return '-';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'number') {
      return Number.isInteger(value)
        ? value.toLocaleString()
        : value.toFixed(2);
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return String(value);
  }
    private writeTimeSeries(
    csv: ReturnType<typeof format>,
    data: AnalyticsExportData,
  ): void {
    csv.write([
      '============================================================',
    ]);

    csv.write([
      'TIME SERIES',
    ]);

    csv.write([
      '============================================================',
    ]);

    csv.write([]);

    const rows = data.timeSeries as Record<
      string,
      unknown
    >[];

    if (!rows.length) {
      csv.write([
        'No time series data available.',
      ]);
      csv.write([]);
      return;
    }

    const headers = Object.keys(rows[0]);

    csv.write(
      headers.map((header) =>
        this.humanize(header),
      ),
    );

    rows.forEach((row) => {
      csv.write(
        headers.map((header) =>
          this.formatValue(
            row[header],
          ),
        ),
      );
    });

    csv.write([]);
  }
    private writeBreakdown(
    csv: ReturnType<typeof format>,
    title: string,
    rows: unknown,
  ): void {
    csv.write([
      '============================================================',
    ]);

    csv.write([
      title.toUpperCase(),
    ]);

    csv.write([
      '============================================================',
    ]);

    csv.write([]);

    if (
      !Array.isArray(rows) ||
      rows.length === 0
    ) {
      csv.write([
        'No data available.',
      ]);

      csv.write([]);

      return;
    }

    const first = rows[0] as Record<
      string,
      unknown
    >;

    const headers = Object.keys(first);

    csv.write(
      headers.map((header) =>
        this.humanize(header),
      ),
    );

    rows.forEach((row) => {
      const record =
        row as Record<
          string,
          unknown
        >;

      csv.write(
        headers.map((header) =>
          this.formatValue(
            record[header],
          ),
        ),
      );
    });

    csv.write([]);
  }
}
