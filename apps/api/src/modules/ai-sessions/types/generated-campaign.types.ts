export type MetaCampaignAdType = 'IMAGE' | 'CAROUSEL' | 'VIDEO' | 'NONE';

export interface GeneratedCampaignBudget {
  dailyBudget: number;
  currency?: string;
}

export interface GeneratedImageCampaign {
  campaignType: 'IMAGE';
  campaignName: string;
  objective: string;
  audience: string;
  budget: GeneratedCampaignBudget;
  headlines: string[];
  primaryText: string;
  description: string;
  cta: string;
  creativeBrief: string;
}

export interface GeneratedCarouselCampaign {
  campaignType: 'CAROUSEL';
  campaignName: string;
  objective: string;
  audience: string;
  budget: GeneratedCampaignBudget;
  cardTitles: string[];
  cardDescriptions: string[];
  cardOrder: number[];
  cta: string;
  creativeStrategy: string;
}

export interface GeneratedVideoCampaign {
  campaignType: 'VIDEO';
  campaignName: string;
  objective: string;
  audience: string;
  budget: GeneratedCampaignBudget;
  hook: string;
  videoScript: string;
  storyboard: string[];
  shotList: string[];
  cta: string;
}

/** Campaign plan with no uploaded media — creative attached later or via existing Meta IDs. */
export interface GeneratedNoneCampaign {
  campaignType: 'NONE';
  campaignName: string;
  objective: string;
  audience: string;
  budget: GeneratedCampaignBudget;
  cta: string;
  /** Always false — no image/video upload required. */
  requiresCreative: false;
  creativeNotes?: string;
  existingCreativeId?: string;
  existingPostId?: string;
  headline?: string;
  primaryText?: string;
}

export type GeneratedCampaignPayload =
  | GeneratedImageCampaign
  | GeneratedCarouselCampaign
  | GeneratedVideoCampaign
  | GeneratedNoneCampaign;

export interface StoredGeneratedCampaign {
  campaignType: MetaCampaignAdType;
  payload: GeneratedCampaignPayload;
  generatedAt: string;
  model: string;
  provider: string;
}

/** IDs of draft entities created by Phase 7 Save Draft. */
export interface DraftCampaignIds {
  campaignId: string;
  adSetId: string;
  adId: string;
  creativeId: string;
}

export interface MetaCampaignGeneratorProductInput {
  id: string;
  title: string;
  description: string | null;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  featuredImageUrl: string | null;
  images: Array<{ url: string; alt: string | null }>;
  variants: Array<{
    title: string | null;
    price: string | null;
    inventoryQuantity: number | null;
    sku: string | null;
  }>;
}

export interface MetaCampaignGeneratorAnalyticsInput {
  available: boolean;
  revenue: number | null;
  roas: number | null;
  spend: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  orders: number | null;
  conversions: number | null;
  impressions: number | null;
  clicks: number | null;
  snapshotCount: number;
}

export interface MetaCampaignGeneratorStoreInput {
  storeId: string;
  brand: string;
  currency: string | null;
  advertisingConfiguration: {
    metaBusinessId: string | null;
    adAccountId: string | null;
    facebookPageId: string | null;
    instagramAccountId: string | null;
    pixelId: string | null;
    catalogId: string | null;
  } | null;
}

export interface MetaCampaignGeneratorInputs {
  product: MetaCampaignGeneratorProductInput;
  analytics: MetaCampaignGeneratorAnalyticsInput;
  store: MetaCampaignGeneratorStoreInput;
  interviewAnswers: Record<string, string>;
  campaignType: MetaCampaignAdType;
  /** True when a prior generatedCampaign already exists on the session. */
  isRegeneration?: boolean;
}
