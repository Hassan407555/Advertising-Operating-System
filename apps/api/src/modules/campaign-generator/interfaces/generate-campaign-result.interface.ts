import { CreativeType, PlatformType } from '@prisma/client';

export interface GeneratedCampaignSummary {
  id: string;
  platform: PlatformType;
  name: string;
}

export interface GeneratedAdSetSummary {
  id: string;
  campaignId: string;
  platform: PlatformType;
  country: string;
  name: string;
}

export interface GeneratedAdSummary {
  id: string;
  adSetId: string;
  name: string;
}

export interface GeneratedCreativeSummary {
  id: string;
  type: CreativeType;
  name: string;
}

export interface GenerateCampaignResult {
  campaigns: GeneratedCampaignSummary[];
  adSets: GeneratedAdSetSummary[];
  ads: GeneratedAdSummary[];
  creatives: GeneratedCreativeSummary[];
}
