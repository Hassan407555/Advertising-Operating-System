"use client";

import Link from "next/link";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { usePermission } from "@/hooks/use-permission";
import { AppError } from "@/lib/api/errors";
import { useDashboardSummaryQuery } from "@/features/dashboard/hooks/use-dashboard-summary-query";
import { useSession } from "@/providers/session-provider";
import { formatDateTime } from "@/utils/formatters";

function MetricCard({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}

export function DashboardView() {
  const canViewDashboard = usePermission("view");
  const { organization, user } = useSession();
  const query = useDashboardSummaryQuery(canViewDashboard);

  if (!canViewDashboard) {
    return (
      <PageEmpty
        title="Access restricted"
        description="Your current role does not have access to the dashboard."
      />
    );
  }

  if (query.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="h-28 animate-pulse bg-muted/30" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    const statusCode = query.error instanceof AppError ? query.error.statusCode : 500;
    if (statusCode === 403) {
      return (
        <Card>
          <h2 className="text-lg font-semibold">Forbidden</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your role is authenticated but does not have dashboard access.
          </p>
          <Link href={ROUTES.FORBIDDEN} className="mt-3 inline-block text-sm text-primary underline-offset-2 hover:underline">
            Open forbidden page
          </Link>
        </Card>
      );
    }

    return (
      <Card>
        <h2 className="text-lg font-semibold">Unable to load dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The dashboard endpoint returned an error. You can retry now.
        </p>
        <Button className="mt-3" onClick={() => query.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const data = query.data;
  if (!data) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">No dashboard data</h2>
        <p className="text-sm text-muted-foreground">No data is currently available for this organization.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-2xl font-semibold">Welcome to Advertising OS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user ? `Signed in as ${user.firstName} ${user.lastName}` : "Signed in user"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Active organization: {organization?.name ?? data.organization.activeOrganizationName}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={ROUTES.CAMPAIGNS}>
            <Button variant="secondary">View Campaigns</Button>
          </Link>
          <Link href={ROUTES.CAMPAIGN_GENERATOR}>
            <Button variant="secondary">Open Generator</Button>
          </Link>
          <Link href={ROUTES.PUBLISHER}>
            <Button variant="secondary">Open Publisher</Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Campaigns" value={data.campaigns.total} hint={`Published: ${data.campaigns.published}`} />
        <MetricCard title="Automation Runs" value={data.automation.totalWorkflowRuns} hint={`Running: ${data.automation.running}`} />
        <MetricCard title="Connected Platforms" value={data.organization.connectedPlatforms.length} />
        <MetricCard title="Shopify Products" value={data.shopify.products} hint={data.shopify.storeConnected ? "Store connected" : "Store not connected"} />
        <MetricCard title="Spend" value={data.analytics.spend.toFixed(2)} />
        <MetricCard title="Revenue" value={data.analytics.revenue.toFixed(2)} />
        <MetricCard title="Impressions" value={data.analytics.impressions} />
        <MetricCard title="Clicks" value={data.analytics.clicks} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Platform Status</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Meta</span>
              <span className="text-muted-foreground">{data.platforms.meta.tokenStatus}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>TikTok</span>
              <span className="text-muted-foreground">{data.platforms.tiktok.tokenStatus}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          {data.recent.campaigns.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No recent campaign activity yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {data.recent.campaigns.slice(0, 5).map((campaign) => (
                <li key={campaign.id} className="flex items-center justify-between">
                  <span className="truncate">{campaign.name}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(campaign.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
