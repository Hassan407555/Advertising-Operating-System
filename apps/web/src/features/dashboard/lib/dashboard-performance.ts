import type { DashboardSummary } from "@/types/dashboard";

export type PerformanceMetric = {
  id: string;
  label: string;
  value: string;
  hint: string;
  /** True when the value is a graceful placeholder, not a real metric. */
  placeholder?: boolean;
};

export type ActivityTimelineItem = {
  id: string;
  kind: "campaign" | "session" | "store" | "sync";
  title: string;
  meta: string;
  href?: string;
  occurredAt: string | null;
  status?: string;
};

/**
 * Performance Overview metrics aligned to Mission Control brief.
 * Missing values render as graceful placeholders (no backend changes).
 */
export function derivePerformanceMetrics(
  data: DashboardSummary,
  options: { lastShopifySyncAt?: string | null } = {},
): PerformanceMetric[] {
  const lastShopifySync = options.lastShopifySyncAt ?? null;
  const connectedStores = data.shopify.connectedStores ?? (data.shopify.storeConnected ? 1 : 0);

  return [
    {
      id: "products",
      label: "Products",
      value: formatCount(data.shopify.products),
      hint: data.shopify.storeConnected ? "Synced from Shopify" : "Connect Shopify to sync",
    },
    {
      id: "campaigns",
      label: "Campaigns",
      value: formatCount(data.campaigns.total),
      hint: `${formatCount(data.advertising.metaCampaigns)} AI-generated`,
    },
    {
      id: "drafts",
      label: "Drafts",
      value: formatCount(data.campaigns.draft),
      hint: "Ready for review or edit",
    },
    {
      id: "ai-sessions",
      label: "AI Sessions",
      value: formatCount(data.aiSessions?.total ?? 0),
      hint: "Interview and generation history",
    },
    {
      id: "connected-stores",
      label: "Connected Stores",
      value: formatCount(connectedStores),
      hint: connectedStores > 0 ? "Shopify linked" : "No store connected",
    },
    {
      id: "last-sync",
      label: "Last Sync",
      value: lastShopifySync ? formatRelativeOrAbsolute(lastShopifySync) : "—",
      hint: lastShopifySync ? "Most recent catalog sync" : "No sync recorded yet",
      placeholder: !lastShopifySync,
    },
    {
      id: "ai-generation-time",
      label: "AI Generation Time",
      value: "—",
      hint: "Timing metrics coming soon",
      placeholder: true,
    },
  ];
}

export function deriveActivityTimeline(
  data: DashboardSummary,
  routes: {
    campaignDetails: (id: string) => string;
    sessionDetails: (id: string) => string;
    shopifyConnections: string;
  },
): ActivityTimelineItem[] {
  const items: ActivityTimelineItem[] = [];

  for (const campaign of data.recent.campaigns) {
    items.push({
      id: `campaign-${campaign.id}`,
      kind: "campaign",
      title: campaign.name,
      meta: "Campaign",
      href: routes.campaignDetails(campaign.id),
      occurredAt: campaign.updatedAt,
      status: campaign.status,
    });
  }

  for (const session of data.recent.aiSessions ?? []) {
    items.push({
      id: `session-${session.id}`,
      kind: "session",
      title: session.productTitle ?? "AI session",
      meta: "AI session",
      href: routes.sessionDetails(session.id),
      occurredAt: session.lastActivityAt,
      status: session.status,
    });
  }

  for (const store of data.recent.stores ?? []) {
    items.push({
      id: `store-${store.id}`,
      kind: "store",
      title: store.name,
      meta: store.shopDomain,
      href: routes.shopifyConnections,
      occurredAt: store.updatedAt,
      status: store.status,
    });
  }

  if (data.synchronization.lastSynchronization) {
    items.push({
      id: "sync-last",
      kind: "sync",
      title: "Campaign synchronization",
      meta: `${data.synchronization.campaignsSynced} synced · ${data.synchronization.failedSyncs} failed`,
      occurredAt: data.synchronization.lastSynchronization,
    });
  }

  return items
    .sort((a, b) => {
      const aTime = a.occurredAt ? Date.parse(a.occurredAt) : 0;
      const bTime = b.occurredAt ? Date.parse(b.occurredAt) : 0;
      return bTime - aTime;
    })
    .slice(0, 8);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatRelativeOrAbsolute(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 14) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(date);
}
