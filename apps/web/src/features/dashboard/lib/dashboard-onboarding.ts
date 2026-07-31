import type { DashboardSummary } from "@/types/dashboard";
import { ROUTES } from "@/constants/routes";
import { deriveCampaignReadiness } from "@/features/campaign-readiness/lib/derive-campaign-readiness";
import type { StoreCapabilities } from "@/features/stores/types/store.types";

export type OnboardingMilestoneId =
  | "organization"
  | "shopify"
  | "products"
  | "advertising"
  | "campaign";

export type OnboardingMilestone = {
  id: OnboardingMilestoneId;
  title: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
};

export type DashboardOnboardingState = {
  milestones: OnboardingMilestone[];
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  isComplete: boolean;
  /** First incomplete milestone — primary CTA target */
  nextMilestone: OnboardingMilestone | null;
};

export type OnboardingEnrichment = {
  capabilities?: StoreCapabilities;
  recentCampaignId?: string;
};

/**
 * Derives dashboard onboarding progress from existing GET /dashboard summary
 * (and optional client store state). Milestones update as org/store/meta/campaign state changes.
 */
export function deriveDashboardOnboarding(
  data: DashboardSummary,
  enrichment: OnboardingEnrichment = {},
): DashboardOnboardingState {
  const readiness = deriveCampaignReadiness({
    capabilities: enrichment.capabilities,
    campaignId: enrichment.recentCampaignId,
    hasCampaignGenerated: data.campaigns.total > 0,
    isLive: data.campaigns.published > 0 || data.campaigns.active > 0,
  });
  const hasOrganization = Boolean(data.organization.activeOrganizationId || data.organization.activeOrganizationName);

  const milestones: OnboardingMilestone[] = [
    {
      id: "organization",
      title: "Organization Created",
      description: "Your workspace is ready. Invite teammates anytime from Organization.",
      done: hasOrganization,
      href: ROUTES.ORGANIZATION,
      cta: "View organization",
    },
    {
      id: "shopify",
      title: "Shopify Connected",
      description: "Link a Shopify store to sync catalog data into the studio.",
      done: readiness.flags.shopifyConnected,
      href: ROUTES.SHOPIFY_CONNECTIONS,
      cta: "Connect Shopify",
    },
    {
      id: "products",
      title: "Products Synced",
      description: "Sync products so AI can generate campaigns from your catalog.",
      done: readiness.flags.productsSynced,
      href: ROUTES.SHOPIFY,
      cta: "Sync products",
    },
    {
      id: "campaign",
      title: "First AI Campaign Generated",
      description:
        "Run an AI interview, save a draft, and open Campaign Details. Meta is not required yet.",
      done: readiness.flags.aiCampaignGenerated,
      href: ROUTES.PRODUCTS,
      cta: "Generate AI campaign",
    },
    {
      id: "advertising",
      title: "Advertising Configuration Completed",
      description:
        "Connect Meta and finish advertising defaults, then return to Campaign Details to publish.",
      done: readiness.flags.metaAdvertisingConfigured,
      href: readiness.primaryAction.href ?? ROUTES.ADVERTISING_CONFIGURATION,
      cta: readiness.flags.metaAdvertisingConfigured
        ? "Ready to publish"
        : readiness.next.actionLabel ?? "Configure advertising",
    },
  ];

  const completedCount = milestones.filter((m) => m.done).length;
  const totalCount = milestones.length;
  const percentComplete = Math.round((completedCount / totalCount) * 100);
  const nextMilestone = milestones.find((m) => !m.done) ?? null;

  return {
    milestones,
    completedCount,
    totalCount,
    percentComplete,
    isComplete: completedCount === totalCount,
    nextMilestone,
  };
}
