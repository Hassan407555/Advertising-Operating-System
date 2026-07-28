import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type {
  AnalyticsBreakdownQuery,
  AnalyticsBreakdownRow,
  AnalyticsDashboardResponse,
  AnalyticsQuery,
  AnalyticsSnapshot,
  AnalyticsSnapshotsResponse,
  AnalyticsSummary,
  AnalyticsTimeSeriesPoint,
} from "@/features/analytics/types/analytics.types";

export async function getAnalyticsSnapshots(query: AnalyticsQuery) {
  const response = await apiClient.get("/analytics", { params: query });
  return unwrapEnvelope<AnalyticsSnapshotsResponse>(response.data);
}

export async function getAnalyticsDashboard(query: AnalyticsQuery) {
  const response = await apiClient.get("/analytics/dashboard", { params: query });
  return unwrapEnvelope<AnalyticsDashboardResponse>(response.data);
}

export async function getAnalyticsSummary(query: AnalyticsQuery) {
  const response = await apiClient.get("/analytics/summary", { params: query });
  return unwrapEnvelope<AnalyticsSummary>(response.data);
}

export async function getAnalyticsTimeSeries(query: AnalyticsQuery) {
  const response = await apiClient.get("/analytics/timeseries", { params: query });
  return unwrapEnvelope<AnalyticsTimeSeriesPoint[]>(response.data);
}

export async function getAnalyticsBreakdown(query: AnalyticsBreakdownQuery) {
  const response = await apiClient.get("/analytics/breakdown", { params: query });
  return unwrapEnvelope<AnalyticsBreakdownRow[]>(response.data);
}

export async function getAnalyticsSnapshotById(id: string) {
  const response = await apiClient.get(`/analytics/${id}`);
  return unwrapEnvelope<AnalyticsSnapshot>(response.data);
}

export async function exportAnalyticsReport(format: "csv" | "xlsx" | "pdf", query: AnalyticsQuery) {
  const response = await apiClient.get(`/analytics/export/${format}`, {
    params: query,
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] as string | undefined;
  const fallback = `analytics-report.${format}`;
  const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch?.[1] ?? fallback;

  return {
    blob: response.data as Blob,
    filename,
  };
}
