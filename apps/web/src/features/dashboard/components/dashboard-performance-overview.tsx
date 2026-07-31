"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Megaphone,
  Package,
  RefreshCw,
  Sparkles,
  Store,
  Waypoints,
  Zap,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionHeader } from "@/components/shared/section-header";
import { PageGrid } from "@/components/shared/layout/page-grid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import {
  deriveActivityTimeline,
  derivePerformanceMetrics,
} from "@/features/dashboard/lib/dashboard-performance";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/types/dashboard";
import { formatDateTime } from "@/utils/formatters";

interface DashboardPerformanceOverviewProps {
  data: DashboardSummary;
  lastShopifySyncAt?: string | null;
}

/**
 * Shown only after onboarding milestones are complete.
 */
export function DashboardPerformanceOverview({
  data,
  lastShopifySyncAt = null,
}: DashboardPerformanceOverviewProps) {
  const metrics = derivePerformanceMetrics(data, { lastShopifySyncAt });
  const timeline = deriveActivityTimeline(data, {
    campaignDetails: ROUTES.CAMPAIGN_DETAILS,
    sessionDetails: ROUTES.AI_SESSION_DETAILS,
    shopifyConnections: ROUTES.SHOPIFY_CONNECTIONS,
  });

  return (
    <section aria-labelledby="dashboard-performance-heading" className="space-y-4">
      <SectionHeader
        titleId="dashboard-performance-heading"
        title="Performance Overview"
        description="Operational health across campaigns, catalog sync, and AI generation."
      />

      <PageGrid cols={4} gap="sm">
        {metrics.map((metric) => (
          <Card key={metric.id} variant="elevated" padding="sm" className="space-y-2">
            <p className="text-eyebrow">{metric.label}</p>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums tracking-tight",
                metric.placeholder ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {metric.value}
            </p>
            <p className="text-caption">{metric.hint}</p>
          </Card>
        ))}
      </PageGrid>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card variant="elevated" padding="lg" className="space-y-4 lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-eyebrow">Activity</p>
              <h3 className="mt-1 text-subheading">Recent activity timeline</h3>
              <p className="mt-1 text-body-sm">
                Latest campaigns, AI sessions, and store changes in this organization.
              </p>
            </div>
            <Link href={ROUTES.CAMPAIGNS} className="shrink-0">
              <Button variant="ghost" size="sm" className="gap-1">
                History
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            </Link>
          </div>

          {timeline.length === 0 ? (
            <div className="rounded-[var(--radius-xl)] bg-muted/20 px-4 py-8 text-center shadow-[var(--shadow-xs)]">
              <p className="text-sm font-medium text-foreground">No recent activity yet</p>
              <p className="mt-1 text-body-sm">
                Generate a campaign or sync products to populate this timeline.
              </p>
            </div>
          ) : (
            <ol className="relative space-y-0 border-l border-border/50 pl-5">
              {timeline.map((item) => (
                <li key={item.id} className="relative pb-5 last:pb-0">
                  <span
                    className={cn(
                      "absolute -left-[1.4rem] top-1.5 flex size-5 items-center justify-center rounded-full ring-4 ring-card",
                      item.kind === "session" && "bg-primary/20 text-primary",
                      item.kind === "campaign" && "bg-success-muted text-success",
                      item.kind === "store" && "bg-muted text-muted-foreground",
                      item.kind === "sync" && "bg-muted text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    <TimelineIcon kind={item.kind} />
                  </span>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="truncate font-medium tracking-tight text-foreground hover:text-primary"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <p className="truncate font-medium tracking-tight text-foreground">
                          {item.title}
                        </p>
                      )}
                      <p className="mt-0.5 text-caption">{item.meta}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {item.status ? <StatusBadge status={item.status} /> : null}
                      <time className="text-caption" dateTime={item.occurredAt ?? undefined}>
                        {item.occurredAt ? formatDateTime(item.occurredAt) : "—"}
                      </time>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card variant="ai" padding="lg" className="flex flex-col space-y-4 lg:col-span-2">
          <div>
            <p className="text-eyebrow">Quick actions</p>
            <h3 className="mt-1 text-subheading">Continue your workflow</h3>
            <p className="mt-1 text-body-sm">Jump into the most common studio tasks.</p>
          </div>
          <div className="grid gap-2">
            <QuickAction href={ROUTES.PRODUCTS} icon={Zap} label="Generate Campaign" primary />
            <QuickAction href={ROUTES.SHOPIFY} icon={RefreshCw} label="Sync Shopify" />
            <QuickAction href={ROUTES.PRODUCTS} icon={Package} label="Browse Products" />
            <QuickAction
              href={ROUTES.ADVERTISING_CONFIGURATION}
              icon={Waypoints}
              label="Advertising Settings"
            />
          </div>
        </Card>
      </div>
    </section>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  primary = false,
}: {
  href: string;
  icon: typeof Sparkles;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Button
        variant={primary ? "ai" : "secondary"}
        className="h-10 w-full justify-start gap-2 px-3"
        size="sm"
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        {label}
      </Button>
    </Link>
  );
}

function TimelineIcon({ kind }: { kind: "campaign" | "session" | "store" | "sync" }) {
  const className = "size-3";
  switch (kind) {
    case "campaign":
      return <Megaphone className={className} />;
    case "session":
      return <Sparkles className={className} />;
    case "store":
      return <Store className={className} />;
    case "sync":
      return <RefreshCw className={className} />;
    default:
      return <Clock3 className={className} />;
  }
}
