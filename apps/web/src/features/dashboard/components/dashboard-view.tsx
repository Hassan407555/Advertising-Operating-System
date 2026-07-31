"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  Megaphone,
  Package,
  Sparkles,
  Store,
  Waypoints,
  Zap,
} from "lucide-react";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageGrid } from "@/components/shared/layout/page-grid";
import { SectionHeader } from "@/components/shared/section-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { DashboardOnboardingCard } from "@/features/dashboard/components/dashboard-onboarding-card";
import { DashboardPerformanceOverview } from "@/features/dashboard/components/dashboard-performance-overview";
import { useDashboardSummaryQuery } from "@/features/dashboard/hooks/use-dashboard-summary-query";
import { deriveDashboardOnboarding } from "@/features/dashboard/lib/dashboard-onboarding";
import {
  deriveContextualRecommendation,
  deriveSystemStatus,
  type SystemStatusTone,
} from "@/features/dashboard/lib/dashboard-recommendations";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";
import { usePermission } from "@/hooks/use-permission";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";
import { deriveCampaignReadiness } from "@/features/campaign-readiness/lib/derive-campaign-readiness";

function MetricCard({
  title,
  value,
  hint,
  href,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint?: string;
  href?: string;
  icon: typeof Store;
}) {
  const content = (
    <Card variant="elevated" padding="default" className="group relative h-full overflow-hidden">
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="text-eyebrow">{title}</div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden />
          </div>
        </div>
        <div className="mt-4 text-3xl font-semibold tracking-tight tabular-nums text-foreground sm:text-4xl">
          {value}
        </div>
        {hint ? <div className="mt-auto pt-3 text-body-sm">{hint}</div> : null}
      </div>
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      className="block rounded-[var(--radius-xl)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
    >
      {content}
    </Link>
  );
}

function ActionEmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon: typeof Sparkles;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-muted/15 px-6 py-10 text-center shadow-[var(--shadow-xs)]">
      <div className="mb-4 flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="text-subheading">{title}</h3>
      <p className="mt-2 max-w-md text-body-sm">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page-stack animate-fade-in" aria-busy="true" aria-live="polite">
      <div className="overflow-hidden rounded-[var(--radius-xl)] bg-muted/20 p-8 shadow-[var(--shadow-card)]">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        <div className="mt-6 flex flex-wrap gap-3">
          <Skeleton className="h-11 w-44" />
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
      <Card variant="elevated" padding="lg" className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-2 w-full" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </Card>
      <PageGrid cols={3}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="h-[148px] space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="size-9 rounded-[var(--radius-md)]" />
            </div>
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </PageGrid>
    </div>
  );
}

function SystemStatusCard({
  label,
  status,
  detail,
  tone,
}: {
  label: string;
  status: string;
  detail: string;
  tone: SystemStatusTone;
}) {
  const toneClasses: Record<SystemStatusTone, string> = {
    healthy: "bg-success-muted/50",
    attention: "bg-warning-muted/40",
    offline: "bg-muted/40",
  };

  const dotClasses: Record<SystemStatusTone, string> = {
    healthy: "bg-success",
    attention: "animate-pulse bg-amber-400",
    offline: "bg-muted-foreground/50",
  };

  return (
    <div className={cn("rounded-[var(--radius-xl)] px-4 py-4", toneClasses[tone])}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn("size-2 shrink-0 rounded-full", dotClasses[tone])} aria-hidden />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 pl-[18px] text-caption">{detail}</p>
    </div>
  );
}

export function DashboardView() {
  const canViewDashboard = usePermission("view");
  const { organization, user } = useSession();
  const { activeStore } = useActiveStore();
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
  const connectedStores = data.shopify.connectedStores ?? (data.shopify.storeConnected ? 1 : 0);
  const hasStore = connectedStores > 0 || data.shopify.storeConnected;

  const onboarding = deriveDashboardOnboarding(data, {
    capabilities: activeStore?.capabilities,
    recentCampaignId: recentCampaigns[0]?.id,
  });
  const recommendation = deriveContextualRecommendation(data, onboarding);
  const systemStatus = deriveSystemStatus(data);

  const lastShopifySyncAt =
    activeStore?.lastSuccessfulSyncAt ??
    activeStore?.lastSyncedAt ??
    activeStore?.capabilities?.lastSyncAt ??
    null;

  const orgName = organization?.name ?? data.organization.activeOrganizationName;
  const welcomeLine = user
    ? `Welcome back, ${user.firstName}. Build high-converting Meta ads from your Shopify catalog with AI.`
    : "Build high-converting Meta ads from your Shopify catalog with AI.";

  const primaryCtaHref = onboarding.nextMilestone?.href ?? ROUTES.PRODUCTS;
  const primaryCtaLabel = onboarding.isComplete
    ? "Generate Campaign"
    : (onboarding.nextMilestone?.cta ?? "Continue setup");

  const recommendationTone = {
    primary: "bg-primary-muted/40 ring-1 ring-primary/20",
    success: "bg-success-muted/50",
    muted: "bg-muted/40",
  } as const;

  return (
    <div className="page-stack animate-fade-in-up">
      <section
        aria-labelledby="dashboard-hero-heading"
        className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-muted/40 via-card to-primary-muted/25 p-6 shadow-[var(--shadow-card)] sm:p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.12),transparent_55%)]" />
        <div className="relative">
          <p className="text-eyebrow">Mission Control</p>
          <h1 id="dashboard-hero-heading" className="mt-2 text-display">
            AI Meta Ads Studio
          </h1>
          <p className="mt-3 max-w-2xl text-body-sm sm:text-base">{welcomeLine}</p>
          <p className="mt-2 text-caption">Active organization: {orgName}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={primaryCtaHref} className="sm:w-auto">
              <Button size="lg" variant={onboarding.isComplete ? "ai" : "default"} className="w-full gap-2 sm:w-auto">
                <Zap className="size-4" aria-hidden />
                {primaryCtaLabel}
              </Button>
            </Link>
            {!onboarding.isComplete && !hasStore ? (
              <Link href={ROUTES.SHOPIFY_CONNECTIONS} className="sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full gap-2 sm:w-auto">
                  <Store className="size-4" aria-hidden />
                  Connect Shopify
                </Button>
              </Link>
            ) : (
              <Link href={ROUTES.PRODUCTS} className="sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full gap-2 sm:w-auto">
                  <Package className="size-4" aria-hidden />
                  Browse Products
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <Card
        className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", recommendationTone[recommendation.tone])}
        padding="default"
      >
        <div className="min-w-0">
          <p className="text-eyebrow">Recommendation</p>
          <p className="mt-1 text-subheading">{recommendation.title}</p>
          <p className="mt-1 text-body-sm">{recommendation.description}</p>
        </div>
        <Link href={recommendation.href} className="shrink-0">
          <Button
            size="sm"
            variant={recommendation.tone === "primary" ? "default" : "secondary"}
            className="gap-1.5"
          >
            {recommendation.cta}
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        </Link>
      </Card>

      {onboarding.isComplete ? (
        <DashboardPerformanceOverview data={data} lastShopifySyncAt={lastShopifySyncAt} />
      ) : (
        <DashboardOnboardingCard onboarding={onboarding} />
      )}

      {!onboarding.isComplete ? (
        <section aria-labelledby="dashboard-summary-heading" className="space-y-4">
          <SectionHeader
            titleId="dashboard-summary-heading"
            title="Summary"
            description="Key signals across your advertising workspace."
          />
          <PageGrid cols={3}>
            <MetricCard
              title="Stores"
              value={connectedStores}
              hint={hasStore ? "Shopify connected" : "No store connected"}
              href={ROUTES.SHOPIFY_CONNECTIONS}
              icon={Store}
            />
            <MetricCard
              title="Products"
              value={data.shopify.products}
              hint="Synced from Shopify"
              href={ROUTES.PRODUCTS}
              icon={Package}
            />
            <MetricCard
              title="Drafts"
              value={data.campaigns.draft}
              hint="Ready for review or edit"
              href={ROUTES.CAMPAIGNS}
              icon={Megaphone}
            />
            <MetricCard
              title="Campaigns"
              value={data.advertising.metaCampaigns}
              hint={`Total: ${data.campaigns.total}`}
              href={ROUTES.CAMPAIGNS}
              icon={Sparkles}
            />
            <MetricCard
              title="AI Sessions"
              value={data.aiSessions?.total ?? 0}
              hint="Interview and generation history"
              href={ROUTES.AI_SESSIONS}
              icon={Bot}
            />
            <MetricCard
              title="Organizations"
              value={data.organization.totalOrganizations}
              hint={data.organization.activeOrganizationName}
              href={ROUTES.ORGANIZATION}
              icon={Building2}
            />
          </PageGrid>
        </section>
      ) : null}

      <section aria-labelledby="dashboard-system-status-heading">
        <Card variant="elevated" padding="lg" className="space-y-5">
          <SectionHeader
            titleId="dashboard-system-status-heading"
            title="System Status"
            description="Shopify, AI engine, data, and advertising health."
          />
          <PageGrid cols={2} gap="sm">
            {systemStatus.map((item) => (
              <SystemStatusCard
                key={item.id}
                label={item.label}
                status={item.status}
                detail={item.detail}
                tone={item.tone}
              />
            ))}
          </PageGrid>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={ROUTES.ADVERTISING_CONFIGURATION}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Waypoints className="size-3.5" aria-hidden />
                Advertising Settings
              </Button>
            </Link>
            <Link href={ROUTES.SHOPIFY}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Store className="size-3.5" aria-hidden />
                Sync Shopify
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      <section aria-labelledby="dashboard-recent-campaigns-heading">
        <Card variant="elevated" padding="lg" className="space-y-4">
          <SectionHeader
            titleId="dashboard-recent-campaigns-heading"
            title="Recent Campaigns"
            description="Latest drafts and published Meta campaigns."
            actions={
              <Link
                href={ROUTES.CAMPAIGNS}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                View all
              </Link>
            }
          />
          {recentCampaigns.length === 0 ? (
            <ActionEmptyState
              title="No campaigns"
              description="Pick a product, run a short AI interview, and generate your first Meta campaign draft."
              icon={Megaphone}
              action={
                <Link href={ROUTES.PRODUCTS}>
                  <Button className="gap-2">
                    <Zap className="size-4" aria-hidden />
                    Generate Campaign
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border/40">
              {recentCampaigns.map((campaign) => (
                <li key={campaign.id}>
                  {(() => {
                    const campaignReadiness = deriveCampaignReadiness({
                      capabilities: activeStore?.capabilities,
                      campaignId: campaign.id,
                      hasCampaignGenerated: true,
                      isLive: campaign.status === "ACTIVE",
                    });

                    return (
                      <Link
                        href={ROUTES.CAMPAIGN_DETAILS(campaign.id)}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] px-2 py-3 text-sm transition-surface hover:bg-muted/40"
                      >
                        <span className="min-w-0">
                          <span className="truncate font-medium">{campaign.name}</span>
                          <span className="block text-caption">
                            Progress: {campaignReadiness.requiredProgress.completed}/
                            {campaignReadiness.requiredProgress.total} (
                            {campaignReadiness.requiredProgress.percent}%)
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={campaign.status} />
                          <span className="text-caption">{formatDateTime(campaign.updatedAt)}</span>
                        </span>
                      </Link>
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section aria-labelledby="dashboard-recent-sessions-heading">
        <Card variant="elevated" padding="lg" className="space-y-4">
          <SectionHeader
            titleId="dashboard-recent-sessions-heading"
            title="Recent AI Sessions"
            description="Interview and generation activity."
            actions={
              <Link
                href={ROUTES.AI_SESSIONS}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                View all
              </Link>
            }
          />
          {recentSessions.length === 0 ? (
            <ActionEmptyState
              title="No interviews"
              description="Start from Products to interview your offering and let AI plan a Meta campaign."
              icon={Bot}
              action={
                <Link href={ROUTES.PRODUCTS}>
                  <Button variant="secondary" className="gap-2">
                    <Package className="size-4" aria-hidden />
                    Browse Products
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border/40">
              {recentSessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={ROUTES.AI_SESSION_DETAILS(session.id)}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] px-2 py-3 text-sm transition-surface hover:bg-muted/40"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {session.productTitle ?? "Product campaign"}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={session.status} />
                      <span className="text-caption">
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
    </div>
  );
}
