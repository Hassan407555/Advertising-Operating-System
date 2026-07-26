import { ExportFormat } from '../enums/export-format.enum';
import { AnalyticsExportData } from './analytics-export-data.interface';

export interface AnalyticsExporter {
  supports(format: ExportFormat): boolean;

  export(
    data: AnalyticsExportData,
  ): Promise<Buffer>;
}