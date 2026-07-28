"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/states/page-loading";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { Card } from "@/components/ui/card";
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
    return (
      <RequireActiveStore>
        <PageEmpty title="Access restricted" description="Your role does not have analytics access." />
      </RequireActiveStore>
    );
  }

  if (dashboardQuery.isError || summaryQuery.isError || timeSeriesQuery.isError || breakdownQuery.isError || snapshotsQuery.isError) {
    return (
      <RequireActiveStore>
        <PageError
          title="Unable to load analytics"
          message={getErrorMessage(
            dashboardQuery.error ??
              summaryQuery.error ??
              timeSeriesQuery.error ??
              breakdownQuery.error ??
              snapshotsQuery.error,
            "Analytics could not be loaded.",
          )}
          onRetry={() => {
            dashboardQuery.refetch();
            summaryQuery.refetch();
            timeSeriesQuery.refetch();
            breakdownQuery.refetch();
            snapshotsQuery.refetch();
          }}
        />
      </RequireActiveStore>
    );
  }

  const isInitialLoading =
    (dashboardQuery.isLoading ||
      summaryQuery.isLoading ||
      timeSeriesQuery.isLoading ||
      breakdownQuery.isLoading ||
      snapshotsQuery.isLoading) &&
    !summaryQuery.data;

  return (
    <RequireActiveStore>
      <div className="space-y-4">
        <PageHeader
          title="Analytics"
          description="Performance metrics for your Meta campaigns and store."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => doExport("csv")}
                disabled={exportMutation.isPending}
              >
                {exportMutation.isPending ? "Exporting…" : "Export CSV"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => doExport("xlsx")}
                disabled={exportMutation.isPending}
              >
                Export XLSX
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => doExport("pdf")}
                disabled={exportMutation.isPending}
              >
                Export PDF
              </Button>
            </div>
          }
        />

        <AnalyticsFilters value={filters} campaigns={campaignsQuery.data ?? []} onChange={patchFilters} />

        {isInitialLoading ? <PageLoading cards={3} /> : null}

        {!isInitialLoading && summaryQuery.data ? <AnalyticsKpiCards summary={summaryQuery.data} /> : null}

        {!isInitialLoading && timeSeriesQuery.isSuccess ? (
          timeSeriesQuery.data?.length ? (
            <AnalyticsTimeSeriesChart data={timeSeriesQuery.data} />
          ) : (
            <PageEmpty
              title="No time series data"
              description="No performance data is available for the selected filters."
            />
          )
        ) : null}

        {!isInitialLoading && breakdownQuery.isSuccess ? (
          breakdownQuery.data?.length ? (
            <>
              <AnalyticsBreakdownChart
                data={breakdownQuery.data}
                title={`Breakdown (${filters.dimension})`}
              />
              <AnalyticsBreakdownTable data={breakdownQuery.data} loading={breakdownQuery.isPending} />
            </>
          ) : (
            <PageEmpty
              title="No breakdown data"
              description="No breakdown rows are available for the selected filters."
            />
          )
        ) : null}

        {!isInitialLoading ? (
          <Card className="space-y-3">
            <h3 className="text-lg font-semibold">Snapshots</h3>
            <AnalyticsSnapshotsTable
              data={snapshotsQuery.data?.data ?? []}
              loading={snapshotsQuery.isPending}
              page={filters.page}
              limit={filters.limit}
              total={snapshotsQuery.data?.meta?.total ?? 0}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onPageChange={(nextPage) => patchFilters({ page: nextPage })}
              onSortChange={(sortBy, sortOrder) => patchFilters({ sortBy, sortOrder })}
            />
          </Card>
        ) : null}
      </div>
    </RequireActiveStore>
  );
}
