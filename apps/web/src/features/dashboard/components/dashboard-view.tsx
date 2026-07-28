"use client";

import Link from "next/link";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { usePermission } from "@/hooks/use-permission";
import { useDashboardSummaryQuery } from "@/features/dashboard/hooks/use-dashboard-summary-query";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";

function MetricCard({
  title,
  value,
  hint,
  href,
}: {
  title: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const content = (
    <Card className="h-full transition-colors hover:bg-muted/20">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      {content}
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="space-y-3 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </div>
      <Card className="space-y-3 p-4">
        <Skeleton className="h-5 w-40" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-40" />
        </div>
      </Card>
    </div>
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
    return <DashboardSkeleton />;
  }

  if (query.isError) {
    return (
      <PageError
        title="Unable to load dashboard"
        message={getErrorMessage(query.error, "The dashboard could not be loaded. Please try again.")}
        onRetry={() => query.refetch()}
      />
    );
  }

  const data = query.data;
  if (!data) {
    return (
      <PageEmpty
        title="No dashboard data"
        description="No data is currently available for this organization."
      />
    );
  }

  const recentCampaigns = data.recent.campaigns.slice(0, 5);
  const recentSessions = (data.recent.aiSessions ?? []).slice(0, 5);
  const meta = data.platforms.meta;
  const connectedStores = data.shopify.connectedStores ?? (data.shopify.storeConnected ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Meta Ads Studio"
        description={
          user
            ? `Welcome back, ${user.firstName}. Active organization: ${organization?.name ?? data.organization.activeOrganizationName}.`
            : `Active organization: ${organization?.name ?? data.organization.activeOrganizationName}.`
        }
      />

      <section aria-labelledby="dashboard-summary-heading" className="space-y-3">
        <h2 id="dashboard-summary-heading" className="text-lg font-semibold">
          Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title="Stores"
            value={connectedStores}
            hint={connectedStores > 0 ? "Shopify connected" : "No store connected"}
            href={ROUTES.SHOPIFY_CONNECTIONS}
          />
          <MetricCard
            title="Products"
            value={data.shopify.products}
            hint="Synced from Shopify"
            href={ROUTES.PRODUCTS}
          />
          <MetricCard
            title="Draft Campaigns"
            value={data.campaigns.draft}
            hint="Ready for review or edit"
            href={ROUTES.CAMPAIGNS}
          />
          <MetricCard
            title="AI Campaigns Generated"
            value={data.advertising.metaCampaigns}
            hint={`Total campaigns: ${data.campaigns.total}`}
            href={ROUTES.CAMPAIGNS}
          />
          <MetricCard
            title="AI Sessions"
            value={data.aiSessions?.total ?? 0}
            hint="Interview and generation history"
            href={ROUTES.AI_SESSIONS}
          />
          <MetricCard
            title="Organizations"
            value={data.organization.totalOrganizations}
            hint={data.organization.activeOrganizationName}
            href={ROUTES.ORGANIZATION}
          />
        </div>
      </section>

      <section aria-labelledby="dashboard-quick-actions-heading">
        <Card className="space-y-3">
          <h2 id="dashboard-quick-actions-heading" className="text-lg font-semibold">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link href={ROUTES.SHOPIFY_CONNECTIONS}>
              <Button variant="secondary">Connect Shopify Store</Button>
            </Link>
            <Link href={ROUTES.SHOPIFY}>
              <Button variant="secondary">Sync Products</Button>
            </Link>
            <Link href={ROUTES.PRODUCTS}>
              <Button>Generate AI Campaign</Button>
            </Link>
            <Link href={`${ROUTES.CAMPAIGNS}?status=DRAFT`}>
              <Button variant="outline">View Draft Campaigns</Button>
            </Link>
          </div>
        </Card>
      </section>

      <section aria-labelledby="dashboard-recent-campaigns-heading">
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="dashboard-recent-campaigns-heading" className="text-lg font-semibold">
              Recent Campaigns
            </h2>
            <Link href={ROUTES.CAMPAIGNS} className="text-sm text-primary underline-offset-4 hover:underline">
              Campaign History
            </Link>
          </div>
          {recentCampaigns.length === 0 ? (
            <PageEmpty
              title="No campaigns yet"
              description="Generate an AI campaign from a product to see it here."
              action={
                <Link href={ROUTES.PRODUCTS}>
                  <Button>Generate AI Campaign</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentCampaigns.map((campaign) => (
                <li key={campaign.id}>
                  <Link
                    href={ROUTES.CAMPAIGN_DETAILS(campaign.id)}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/30 rounded-md px-1"
                  >
                    <span className="min-w-0 truncate font-medium">{campaign.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={campaign.status} />
                      <span className="text-xs text-muted-foreground">{formatDateTime(campaign.updatedAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section aria-labelledby="dashboard-recent-sessions-heading">
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="dashboard-recent-sessions-heading" className="text-lg font-semibold">
              Recent AI Sessions
            </h2>
            <Link href={ROUTES.AI_SESSIONS} className="text-sm text-primary underline-offset-4 hover:underline">
              View all
            </Link>
          </div>
          {recentSessions.length === 0 ? (
            <PageEmpty
              title="No AI sessions yet"
              description="Start from Products to run an interview and generate a Meta campaign."
              action={
                <Link href={ROUTES.PRODUCTS}>
                  <Button variant="secondary">Open Products</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentSessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={ROUTES.AI_SESSION_DETAILS(session.id)}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/30 rounded-md px-1"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {session.productTitle ?? "Product campaign"}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={session.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(session.lastActivityAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section aria-labelledby="dashboard-store-status-heading">
        <Card className="space-y-3">
          <h2 id="dashboard-store-status-heading" className="text-lg font-semibold">
            Store Status
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span>Shopify</span>
              <StatusBadge status={connectedStores > 0 ? "CONNECTED" : "DISCONNECTED"} />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span>Meta</span>
              <StatusBadge status={meta.connected ? "CONNECTED" : meta.tokenStatus} />
            </div>
          </div>
          {(data.recent.stores ?? []).length > 0 ? (
            <ul className="divide-y divide-border text-sm">
              {data.recent.stores.slice(0, 3).map((store) => (
                <li key={store.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{store.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{store.shopDomain}</p>
                  </div>
                  <StatusBadge status={store.status} />
                </li>
              ))}
            </ul>
          ) : (
            <PageEmpty
              title="No stores connected"
              description="Connect a Shopify store to sync products and generate Meta ads."
              action={
                <Link href={ROUTES.SHOPIFY_CONNECTIONS}>
                  <Button>Connect Shopify Store</Button>
                </Link>
              }
            />
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={ROUTES.ADVERTISING_CONFIGURATION}>
              <Button variant="outline" size="sm">
                Advertising Configuration
              </Button>
            </Link>
            <Link href={ROUTES.ANALYTICS}>
              <Button variant="outline" size="sm">
                View Analytics
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
