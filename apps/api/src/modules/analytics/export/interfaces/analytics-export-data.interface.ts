export interface AnalyticsExportData {
  report: AnalyticsReportInfo;

  filters: AnalyticsExportFilters;

  summary: AnalyticsExportSummary;

  timeSeries: AnalyticsExportTimeSeriesRow[];

  breakdown: AnalyticsExportBreakdown;
}

export interface AnalyticsReportInfo {
  title: string;

  generatedAt: Date;

  generatedBy: string;

  organization: string;

  workspace: string;

  timezone: string;

  version: string;
}

export interface AnalyticsExportFilters {
  dateRange: string;

  platform?: string;

  level?: string;

  campaign?: string;

  adSet?: string;

  ad?: string;

  search?: string;

  groupBy?: string;

  sortBy?: string;

  sortOrder?: string;
}

/**
 * Keep these flexible because AnalyticsService
 * returns dynamic objects.
 */
export interface AnalyticsExportSummary {
  [key: string]: unknown;
}

export interface AnalyticsExportTimeSeriesRow {
  [key: string]: unknown;
}

export interface AnalyticsExportTableRow {
  [key: string]: unknown;
}

export interface AnalyticsExportBreakdown {
  campaigns: AnalyticsExportTableRow[];

  adSets: AnalyticsExportTableRow[];

  ads: AnalyticsExportTableRow[];

  creatives: AnalyticsExportTableRow[];
}