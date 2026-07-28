"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  exportAnalyticsReport,
  getAnalyticsBreakdown,
  getAnalyticsDashboard,
  getAnalyticsSnapshotById,
  getAnalyticsSnapshots,
  getAnalyticsSummary,
  getAnalyticsTimeSeries,
} from "@/features/analytics/api/analytics.api";
import { getAnalyticsCampaignOptions } from "@/features/analytics/api/analytics-options.api";
import type { AnalyticsBreakdownQuery, AnalyticsQuery } from "@/features/analytics/types/analytics.types";

export function useAnalyticsDashboardQuery(query: AnalyticsQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS, "dashboard", query],
    queryFn: () => getAnalyticsDashboard(query),
  });
}

export function useAnalyticsSummaryQuery(query: AnalyticsQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS, "summary", query],
    queryFn: () => getAnalyticsSummary(query),
  });
}

export function useAnalyticsTimeSeriesQuery(query: AnalyticsQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS, "timeseries", query],
    queryFn: () => getAnalyticsTimeSeries(query),
  });
}

export function useAnalyticsBreakdownQuery(query: AnalyticsBreakdownQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS, "breakdown", query],
    queryFn: () => getAnalyticsBreakdown(query),
  });
}

export function useAnalyticsSnapshotsQuery(query: AnalyticsQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS, "snapshots", query],
    queryFn: () => getAnalyticsSnapshots(query),
    placeholderData: (previous) => previous,
  });
}

export function useAnalyticsSnapshotDetailsQuery(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS, "details", id],
    queryFn: () => getAnalyticsSnapshotById(id),
    enabled: Boolean(id),
  });
}

export function useAnalyticsCampaignOptionsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS, "campaign-options"],
    queryFn: getAnalyticsCampaignOptions,
  });
}

export function useExportAnalyticsMutation() {
  return useMutation({
    mutationFn: ({ format, query }: { format: "csv" | "xlsx" | "pdf"; query: AnalyticsQuery }) =>
      exportAnalyticsReport(format, query),
  });
}
