import type { DashboardSummary } from "@/types/dashboard";
import { ROUTES } from "@/constants/routes";
import type { DashboardOnboardingState } from "@/features/dashboard/lib/dashboard-onboarding";

export type ContextualRecommendation = {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  tone: "primary" | "success" | "muted";
};

/**
 * Single contextual nudge for Mission Control — owns onboarding messaging only on Dashboard.
 */
export function deriveContextualRecommendation(
  data: DashboardSummary,
  onboarding: DashboardOnboardingState,
): ContextualRecommendation {
  if (onboarding.isComplete) {
    return {
      id: "ready",
      title: "Everything ready",
      description: "Your workspace is set up. Generate another Meta campaign or review drafts.",
      href: ROUTES.PRODUCTS,
      cta: "Generate campaign",
      tone: "success",
    };
  }

  const next = onboarding.nextMilestone;
  if (next) {
    return {
      id: next.id,
      title: next.title,
      description: next.description,
      href: next.href,
      cta: next.cta,
      tone: "primary",
    };
  }

  const connectedStores = data.shopify.connectedStores ?? (data.shopify.storeConnected ? 1 : 0);
  if (connectedStores === 0) {
    return {
      id: "connect-shopify",
      title: "Connect Shopify",
      description: "Link a store so products and sync health appear in the studio.",
      href: ROUTES.SHOPIFY_CONNECTIONS,
      cta: "Connect store",
      tone: "primary",
    };
  }

  return {
    id: "continue",
    title: "Continue setup",
    description: "Finish remaining milestones to unlock the full workflow.",
    href: ROUTES.DASHBOARD,
    cta: "View progress",
    tone: "muted",
  };
}

export type SystemStatusTone = "healthy" | "attention" | "offline";

export type SystemStatusItem = {
  id: string;
  label: string;
  status: string;
  detail: string;
  tone: SystemStatusTone;
};

/**
 * System status from available dashboard signals — no new API calls.
 * Database stays a local-app health placeholder (UI-only).
 */
export function deriveSystemStatus(data: DashboardSummary): SystemStatusItem[] {
  const hasShopify = data.shopify.storeConnected || (data.shopify.connectedStores ?? 0) > 0;
  const meta = data.platforms.meta;
  const hasSessions = (data.aiSessions?.total ?? 0) > 0 || data.advertising.metaCampaigns > 0;

  return [
    {
      id: "shopify",
      label: "Shopify",
      status: hasShopify ? "CONNECTED" : "DISCONNECTED",
      detail: hasShopify
        ? `${data.shopify.connectedStores ?? 1} store connected · ${data.shopify.products} products`
        : "No store linked",
      tone: hasShopify ? "healthy" : "offline",
    },
    {
      id: "ai-engine",
      label: "AI Engine",
      status: hasSessions ? "READY" : "STANDBY",
      detail: hasSessions
        ? `${data.aiSessions?.total ?? 0} sessions · ${data.advertising.metaCampaigns} campaigns`
        : "Ready when you start an interview",
      tone: "healthy",
    },
    {
      id: "database",
      label: "Database",
      status: "HEALTHY",
      detail: "App data reachable",
      tone: "healthy",
    },
    {
      id: "advertising",
      label: "Advertising",
      status: meta.connected ? "CONNECTED" : meta.tokenStatus || "NOT_READY",
      detail: meta.connected
        ? meta.accountName
          ? `Meta · ${meta.accountName}`
          : "Meta connection active"
        : "Configure advertising to publish",
      tone: meta.connected ? "healthy" : "attention",
    },
  ];
}
