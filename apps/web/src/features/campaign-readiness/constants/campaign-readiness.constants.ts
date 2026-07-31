import { ROUTES } from "@/constants/routes";
import type {
  CampaignReadinessActionId,
  CampaignReadinessCurrentStep,
  CampaignReadinessPrimaryAction,
  CampaignReadinessStep,
  CampaignReadinessStepStatus,
} from "@/features/campaign-readiness/types/campaign-readiness.types";

/** Checklist steps that must be done before Publish is shown. */
export const REQUIRED_READINESS_STEP_IDS = [
  "shopify",
  "products",
  "aiCampaign",
  "metaConnected",
  "businessSelected",
  "adAccountSelected",
  "facebookPageSelected",
  "draftSaved",
] as const satisfies readonly CampaignReadinessStep[];

export const OPTIONAL_READINESS_STEP_IDS = [
  "instagramSelected",
  "pixelSelected",
  "catalogSelected",
] as const satisfies readonly CampaignReadinessStep[];

export const CAMPAIGN_READINESS_PRIMARY_ACTIONS = {
  connectShopify: {
    id: "connect_shopify" as const,
    label: "Connect Shopify",
    href: ROUTES.SHOPIFY_CONNECTIONS,
  },
  syncProducts: {
    id: "sync_products" as const,
    label: "Sync Products",
    href: ROUTES.SHOPIFY,
  },
  generateCampaign: {
    id: "generate_campaign" as const,
    label: "Generate Campaign",
    href: ROUTES.PRODUCTS,
  },
  connectMeta: {
    id: "connect_meta" as const,
    label: "Connect Meta",
  },
  selectBusiness: {
    id: "select_business" as const,
    label: "Select Business",
  },
  selectAdAccount: {
    id: "select_ad_account" as const,
    label: "Select Ad Account",
  },
  selectFacebookPage: {
    id: "select_facebook_page" as const,
    label: "Select Page",
  },
  saveDraft: {
    id: "save_draft" as const,
    label: "Save Draft",
    href: ROUTES.PRODUCTS,
  },
  configureOptional: {
    id: "configure_optional" as const,
    label: "Configure",
  },
  /** @deprecated Prefer granular Meta actions; retained for older CTAs. */
  configureMeta: {
    id: "configure_meta" as const,
    label: "Complete Advertising Setup",
  },
  publishCampaign: {
    id: "publish_campaign" as const,
    label: "Publish to Meta",
    action: "publish" as const,
  },
  viewAnalytics: {
    id: "view_analytics" as const,
    label: "View Analytics",
    href: ROUTES.ANALYTICS,
    action: "view_analytics" as const,
  },
} as const;

export const CAMPAIGN_READINESS_STEP_LABELS: Record<CampaignReadinessStepStatus["id"], string> = {
  shopify: "Shopify Connected",
  products: "Products Synced",
  aiCampaign: "AI Campaign Generated",
  metaConnected: "Meta Connected",
  businessSelected: "Business Selected",
  adAccountSelected: "Ad Account Selected",
  facebookPageSelected: "Facebook Page Selected",
  draftSaved: "Draft Saved",
  readyToPublish: "Ready To Publish",
  live: "Live",
  instagramSelected: "Instagram Account",
  pixelSelected: "Meta Pixel",
  catalogSelected: "Product Catalog",
};

export const CAMPAIGN_READINESS_NEXT_TITLES: Record<CampaignReadinessCurrentStep, string> = {
  shopify: "Connect Shopify",
  products: "Sync Products",
  aiCampaign: "Generate Campaign",
  metaConnected: "Connect Meta Account",
  businessSelected: "Select Business",
  adAccountSelected: "Select Ad Account",
  facebookPageSelected: "Select Facebook Page",
  draftSaved: "Save Draft",
  readyToPublish: "Ready To Publish",
  live: "Campaign is Live",
};

export const CAMPAIGN_READINESS_NEXT_MESSAGES: Record<CampaignReadinessCurrentStep, string> = {
  shopify: "Connect your Shopify store before this campaign can be published.",
  products: "Sync products so this campaign has catalog inventory to advertise.",
  aiCampaign: "Generate an AI campaign draft before publishing to Meta.",
  metaConnected: "Connect your Meta account before this campaign can be published.",
  businessSelected: "Select the Meta Business that owns this advertising account.",
  adAccountSelected: "Select the Meta Ad Account that will receive this campaign.",
  facebookPageSelected: "Choose the Facebook Page that will represent this advertisement.",
  draftSaved: "Save this campaign as a draft before publishing to Meta.",
  readyToPublish: "All publishing requirements have been completed.",
  live: "This campaign has been published. Open analytics for performance insights.",
};

/** Maps each required checklist step to its navigation / CTA action. */
export const REQUIRED_STEP_ACTIONS: Record<
  (typeof REQUIRED_READINESS_STEP_IDS)[number],
  CampaignReadinessPrimaryAction
> = {
  shopify: CAMPAIGN_READINESS_PRIMARY_ACTIONS.connectShopify,
  products: CAMPAIGN_READINESS_PRIMARY_ACTIONS.syncProducts,
  aiCampaign: CAMPAIGN_READINESS_PRIMARY_ACTIONS.generateCampaign,
  metaConnected: CAMPAIGN_READINESS_PRIMARY_ACTIONS.connectMeta,
  businessSelected: CAMPAIGN_READINESS_PRIMARY_ACTIONS.selectBusiness,
  adAccountSelected: CAMPAIGN_READINESS_PRIMARY_ACTIONS.selectAdAccount,
  facebookPageSelected: CAMPAIGN_READINESS_PRIMARY_ACTIONS.selectFacebookPage,
  draftSaved: CAMPAIGN_READINESS_PRIMARY_ACTIONS.saveDraft,
};

export const OPTIONAL_STEP_ACTION_LABELS: Record<
  (typeof OPTIONAL_READINESS_STEP_IDS)[number],
  string
> = {
  instagramSelected: "Select Instagram Account",
  pixelSelected: "Select Meta Pixel",
  catalogSelected: "Select Product Catalog",
};

export function isPublishActionId(id: CampaignReadinessActionId): boolean {
  return id === "publish_campaign";
}

export function isMetaSetupStepId(id: CampaignReadinessStep): boolean {
  return (
    id === "metaConnected" ||
    id === "businessSelected" ||
    id === "adAccountSelected" ||
    id === "facebookPageSelected" ||
    id === "instagramSelected" ||
    id === "pixelSelected" ||
    id === "catalogSelected"
  );
}
