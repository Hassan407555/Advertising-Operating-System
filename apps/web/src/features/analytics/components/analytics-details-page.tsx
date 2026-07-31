"use client";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/states/page-loading";
import { PageError } from "@/components/shared/states/page-error";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { usePermission } from "@/hooks/use-permission";
import { useAnalyticsSnapshotDetailsQuery } from "@/features/analytics/hooks/use-analytics";
import { formatDateTime } from "@/utils/formatters";
import { getErrorMessage } from "@/utils/errors";

interface AnalyticsDetailsPageProps {
  id: string;
}

const storeGateProps = {
  emptyTitle: "No analytics",
  emptyDescription: "Connect a store under Commerce to view campaign performance.",
} as const;

export function AnalyticsDetailsPage({ id }: AnalyticsDetailsPageProps) {
  const canView = usePermission("view");
  const detailsQuery = useAnalyticsSnapshotDetailsQuery(id);

  if (!canView) {
    return (
      <RequireActiveStore {...storeGateProps}>
        <PageEmpty title="Access restricted" description="Your role does not have analytics access." />
      </RequireActiveStore>
    );
  }

  if (detailsQuery.isError) {
    return (
      <RequireActiveStore {...storeGateProps}>
        <PageError
          title="Unable to load analytics snapshot"
          message={getErrorMessage(detailsQuery.error)}
          onRetry={() => detailsQuery.refetch()}
        />
      </RequireActiveStore>
    );
  }

  if (!detailsQuery.data) {
    return (
      <RequireActiveStore {...storeGateProps}>
        <PageLoading cards={1} />
      </RequireActiveStore>
    );
  }

  const snapshot = detailsQuery.data;

  return (
    <RequireActiveStore {...storeGateProps}>
      <div className="page-stack animate-fade-in-up">
        <PageHeader
          eyebrow="Performance"
          title="Analytics Snapshot"
          description="Detailed metrics for a single performance snapshot."
        />
        <Card className="space-y-3">
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p><span className="text-muted-foreground">Snapshot Date:</span> {formatDateTime(snapshot.snapshotDate, "yyyy-MM-dd")}</p>
            <p><span className="text-muted-foreground">Platform:</span> {snapshot.platform}</p>
            <p><span className="text-muted-foreground">Level:</span> {snapshot.level}</p>
            <p><span className="text-muted-foreground">Campaign:</span> {snapshot.campaignName ?? "N/A"}</p>
            <p><span className="text-muted-foreground">Ad Set:</span> {snapshot.adSetName ?? "N/A"}</p>
            <p><span className="text-muted-foreground">Ad:</span> {snapshot.adName ?? "N/A"}</p>
            <p><span className="text-muted-foreground">Spend:</span> {snapshot.spend}</p>
            <p><span className="text-muted-foreground">Revenue:</span> {snapshot.revenue ?? "N/A"}</p>
            <p><span className="text-muted-foreground">ROAS:</span> {snapshot.roas ?? "N/A"}</p>
            <p><span className="text-muted-foreground">Impressions:</span> {snapshot.impressions}</p>
            <p><span className="text-muted-foreground">Clicks:</span> {snapshot.clicks}</p>
            <p><span className="text-muted-foreground">CTR:</span> {snapshot.ctr ?? "N/A"}</p>
            <p><span className="text-muted-foreground">Conversions:</span> {snapshot.conversions ?? "N/A"}</p>
            <p><span className="text-muted-foreground">Currency:</span> {snapshot.currency}</p>
          </div>
        </Card>
      </div>
    </RequireActiveStore>
  );
}
