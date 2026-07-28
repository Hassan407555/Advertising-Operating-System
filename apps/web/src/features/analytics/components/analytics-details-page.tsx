"use client";

import { Card } from "@/components/ui/card";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { usePermission } from "@/hooks/use-permission";
import { useAnalyticsSnapshotDetailsQuery } from "@/features/analytics/hooks/use-analytics";
import { formatDateTime } from "@/utils/formatters";
import { getErrorMessage } from "@/utils/errors";

interface AnalyticsDetailsPageProps {
  id: string;
}

export function AnalyticsDetailsPage({ id }: AnalyticsDetailsPageProps) {
  const canView = usePermission("view");
  const detailsQuery = useAnalyticsSnapshotDetailsQuery(id);

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have analytics access." />;
  }

  if (detailsQuery.isError) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Unable to load analytics snapshot</h2>
        <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(detailsQuery.error)}</p>
      </Card>
    );
  }

  if (!detailsQuery.data) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Loading analytics snapshot...</p>
      </Card>
    );
  }

  const snapshot = detailsQuery.data;

  return (
    <Card className="space-y-3">
      <h1 className="text-2xl font-semibold">Analytics Snapshot Details</h1>
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
  );
}
