"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage } from "@/utils/errors";
import { AnalyticsBreakdownChart } from "@/features/analytics/components/analytics-breakdown-chart";
import { AnalyticsBreakdownTable } from "@/features/analytics/components/analytics-breakdown-table";
import { AnalyticsFilters } from "@/features/analytics/components/analytics-filters";
import { AnalyticsKpiCards } from "@/features/analytics/components/analytics-kpi-cards";
import { AnalyticsSnapshotsTable } from "@/features/analytics/components/analytics-snapshots-table";
import { AnalyticsTimeSeriesChart } from "@/features/analytics/components/analytics-timeseries-chart";
import { useAnalyticsFiltersState } from "@/features/analytics/hooks/use-analytics-filters";
import {
  useAnalyticsBreakdownQuery,
  useAnalyticsCampaignOptionsQuery,
  useAnalyticsDashboardQuery,
  useAnalyticsSnapshotsQuery,
  useAnalyticsSummaryQuery,
  useAnalyticsTimeSeriesQuery,
  useExportAnalyticsMutation,
} from "@/features/analytics/hooks/use-analytics";

export function AnalyticsPageContent() {
  const canView = usePermission("view");
  const { filters, patchFilters } = useAnalyticsFiltersState();

  const query = {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    platform: filters.platform,
    level: filters.level,
    campaignId: filters.campaignId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    groupBy: filters.groupBy,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  } as const;

  const campaignsQuery = useAnalyticsCampaignOptionsQuery();
  const dashboardQuery = useAnalyticsDashboardQuery(query);
  const summaryQuery = useAnalyticsSummaryQuery(query);
  const timeSeriesQuery = useAnalyticsTimeSeriesQuery(query);
  const breakdownQuery = useAnalyticsBreakdownQuery({
    ...query,
    dimension: filters.dimension,
  });
  const snapshotsQuery = useAnalyticsSnapshotsQuery(query);
  const exportMutation = useExportAnalyticsMutation();

  const doExport = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      const file = await exportMutation.mutateAsync({ format, query });
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${file.filename}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Export failed."));
    }
  };

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have analytics access." />;
  }

  if (dashboardQuery.isError || summaryQuery.isError || timeSeriesQuery.isError || breakdownQuery.isError || snapshotsQuery.isError) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Unable to load analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {getErrorMessage(
            dashboardQuery.error ?? summaryQuery.error ?? timeSeriesQuery.error ?? breakdownQuery.error ?? snapshotsQuery.error,
          )}
        </p>
        <Button
          type="button"
          className="mt-3"
          onClick={() => {
            dashboardQuery.refetch();
            summaryQuery.refetch();
            timeSeriesQuery.refetch();
            breakdownQuery.refetch();
            snapshotsQuery.refetch();
          }}
        >
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Explore campaign, ad set, ad, and platform performance from backend analytics snapshots.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => doExport("csv")} disabled={exportMutation.isPending}>
            Export CSV
          </Button>
          <Button type="button" variant="secondary" onClick={() => doExport("xlsx")} disabled={exportMutation.isPending}>
            Export XLSX
          </Button>
          <Button type="button" variant="secondary" onClick={() => doExport("pdf")} disabled={exportMutation.isPending}>
            Export PDF
          </Button>
        </div>
      </div>

      <AnalyticsFilters value={filters} campaigns={campaignsQuery.data ?? []} onChange={patchFilters} />

      {summaryQuery.data ? <AnalyticsKpiCards summary={summaryQuery.data} /> : null}

      {timeSeriesQuery.data?.length ? (
        <AnalyticsTimeSeriesChart data={timeSeriesQuery.data} />
      ) : (
        <PageEmpty title="No time series data" description="No data is available for the selected filters." />
      )}

      {breakdownQuery.data?.length ? (
        <>
          <AnalyticsBreakdownChart data={breakdownQuery.data} title={`Breakdown (${filters.dimension})`} />
          <AnalyticsBreakdownTable data={breakdownQuery.data} loading={breakdownQuery.isPending} />
        </>
      ) : (
        <PageEmpty title="No breakdown data" description="No breakdown rows are available for the selected filters." />
      )}

      <Card className="space-y-3">
        <h3 className="text-lg font-semibold">Analytics Snapshots</h3>
        <AnalyticsSnapshotsTable
          data={snapshotsQuery.data?.data ?? []}
          loading={snapshotsQuery.isPending}
          page={filters.page}
          limit={filters.limit}
          total={snapshotsQuery.data?.meta.total ?? 0}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onPageChange={(nextPage) => patchFilters({ page: nextPage })}
          onSortChange={(sortBy, sortOrder) => patchFilters({ sortBy, sortOrder })}
        />
      </Card>
    </div>
  );
}
