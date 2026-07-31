import type { StoreCapabilities } from "@/features/stores/types/store.types";

export type CampaignReadinessState =
  | "SETUP_REQUIRED"
  | "PRODUCTS_REQUIRED"
  | "AI_DRAFT_REQUIRED"
  | "META_CONNECTION_REQUIRED"
  | "BUSINESS_REQUIRED"
  | "AD_ACCOUNT_REQUIRED"
  | "FACEBOOK_PAGE_REQUIRED"
  | "DRAFT_REQUIRED"
  | "READY_TO_PUBLISH"
  | "LIVE";

export type CampaignReadinessActionId =
  | "connect_shopify"
  | "sync_products"
  | "generate_campaign"
  | "connect_meta"
  | "select_business"
  | "select_ad_account"
  | "select_facebook_page"
  | "save_draft"
  | "configure_meta"
  | "configure_optional"
  | "publish_campaign"
  | "view_analytics";

export type CampaignReadinessPrimaryAction = {
  id: CampaignReadinessActionId;
  label: string;
  href?: string;
  action?: "publish" | "view_analytics";
};

export interface CampaignReadinessFlags {
  shopifyConnected: boolean;
  productsSynced: boolean;
  aiCampaignGenerated: boolean;
  metaConnected: boolean;
  businessSelected: boolean;
  adAccountSelected: boolean;
  facebookPageSelected: boolean;
  draftSaved: boolean;
  /** True when Meta advertising destinations are fully selected (independent of draft/campaign). */
  metaAdvertisingConfigured: boolean;
  instagramSelected: boolean;
  pixelSelected: boolean;
  catalogSelected: boolean;
  /** True only when every publishing prerequisite is satisfied. */
  readyToPublish: boolean;
  live: boolean;
}

export type CampaignReadinessStep =
  | "shopify"
  | "products"
  | "aiCampaign"
  | "metaConnected"
  | "businessSelected"
  | "adAccountSelected"
  | "facebookPageSelected"
  | "draftSaved"
  | "readyToPublish"
  | "live"
  | "instagramSelected"
  | "pixelSelected"
  | "catalogSelected";

export interface CampaignReadinessStepStatus {
  id: CampaignReadinessStep;
  label: string;
  done: boolean;
  required: boolean;
}

/**
 * Checklist row consumed by the Publishing Checklist UI.
 * Incomplete rows expose href so the UI can navigate without local branching.
 */
export interface CampaignReadinessChecklistItem {
  id: CampaignReadinessStep;
  /** Completed-state label (e.g. "Meta Connected"). */
  label: string;
  /** Incomplete-state / CTA label (e.g. "Connect Meta Account"). */
  actionLabel: string;
  done: boolean;
  required: boolean;
  /** True for the first incomplete required step. */
  isCurrent: boolean;
  href?: string;
  actionId?: CampaignReadinessActionId;
}

/**
 * Single next-action surface for Campaign Details / Publish UX.
 * Prefer this over branching on individual flags in UI components.
 */
export type CampaignReadinessCurrentStep =
  | "shopify"
  | "products"
  | "aiCampaign"
  | "metaConnected"
  | "businessSelected"
  | "adAccountSelected"
  | "facebookPageSelected"
  | "draftSaved"
  | "readyToPublish"
  | "live";

export interface CampaignReadinessNextAction {
  ready: boolean;
  currentStep: CampaignReadinessCurrentStep;
  nextAction: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  actionId: CampaignReadinessActionId;
  /** When set, the UI should invoke a local handler instead of navigating. */
  action?: "publish" | "view_analytics";
}

export interface CampaignReadinessModel {
  state: CampaignReadinessState;
  flags: CampaignReadinessFlags;
  primaryAction: CampaignReadinessPrimaryAction;
  /** Guided publishing checklist — consume this in Campaign Details UI. */
  next: CampaignReadinessNextAction;
  /** Required publishing prerequisites in order. */
  requiredSteps: CampaignReadinessChecklistItem[];
  /** Optional Meta enhancements — never block publish. */
  optionalSteps: CampaignReadinessChecklistItem[];
  blockingReasons: string[];
  optionalRecommendations: string[];
  requiredProgress: {
    completed: number;
    total: number;
    percent: number;
  };
  optionalProgress: {
    completed: number;
    total: number;
  };
  /** Convenience aliases for progress UI (same values as requiredProgress). */
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  /** Full step list including optional / status steps — prefer requiredSteps/optionalSteps in UI. */
  steps: CampaignReadinessStepStatus[];
}

export interface DeriveCampaignReadinessInput {
  capabilities?: StoreCapabilities;
  campaignId?: string;
  hasCampaignGenerated: boolean;
  /** Explicit override; defaults to true when campaignId is present. */
  hasDraftSaved?: boolean;
  isLive: boolean;
}
