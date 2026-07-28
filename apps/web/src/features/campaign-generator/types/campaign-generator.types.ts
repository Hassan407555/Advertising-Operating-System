export type GeneratorPlatform = "META" | "TIKTOK";
export type MarketingGoal = "AWARENESS" | "TRAFFIC" | "SALES" | "ENGAGEMENT" | "LEADS";
export type GeneratorCreativeType =
  | "IMAGE"
  | "VIDEO"
  | "CAROUSEL"
  | "COLLECTION"
  | "SLIDESHOW"
  | "STORY"
  | "MESSAGE"
  | "INTERACTIVE"
  | "PLAYABLE"
  | "AUDIO"
  | "TEXT"
  | "HTML5";

export interface GenerateCampaignPayload {
  productId: string;
  countries: string[];
  platforms: GeneratorPlatform[];
  dailyBudget: number;
  language: string;
  marketingGoal: MarketingGoal;
  adAccountIds: {
    META?: string;
    TIKTOK?: string;
  };
  currency?: string;
  preferences?: {
    campaignNamePrefix?: string;
    callToAction?: string;
    creativeType?: GeneratorCreativeType;
  };
}

export interface GenerateCampaignResponse {
  campaigns: Array<{
    id: string;
    platform: GeneratorPlatform;
    name: string;
  }>;
  adSets: Array<{
    id: string;
    campaignId: string;
    platform: GeneratorPlatform;
    country: string;
    name: string;
  }>;
  ads: Array<{
    id: string;
    adSetId: string;
    name: string;
  }>;
  creatives: Array<{
    id: string;
    type: GeneratorCreativeType;
    name: string;
  }>;
}
