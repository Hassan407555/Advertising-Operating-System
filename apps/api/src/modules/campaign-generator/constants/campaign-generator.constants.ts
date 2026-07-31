import {
  CallToAction,
  CampaignObjective,
  CreativeType,
  PlatformType,
} from '@prisma/client';

import { MarketingGoal } from '../enums/marketing-goal.enum';

export const CAMPAIGN_GENERATOR_SUPPORTED_PLATFORMS = [
  PlatformType.META,
  PlatformType.TIKTOK,
] as const;

export type CampaignGeneratorPlatform =
  (typeof CAMPAIGN_GENERATOR_SUPPORTED_PLATFORMS)[number];

export const MARKETING_GOAL_TO_OBJECTIVE: Record<
  MarketingGoal,
  CampaignObjective
> = {
  [MarketingGoal.AWARENESS]: CampaignObjective.AWARENESS,
  [MarketingGoal.TRAFFIC]: CampaignObjective.TRAFFIC,
  [MarketingGoal.SALES]: CampaignObjective.SALES,
  [MarketingGoal.ENGAGEMENT]: CampaignObjective.ENGAGEMENT,
  [MarketingGoal.LEADS]: CampaignObjective.LEADS,
};

export const DEFAULT_CALL_TO_ACTION = CallToAction.SHOP_NOW;

export const PLATFORM_PLACEMENTS: Record<
  CampaignGeneratorPlatform,
  string[]
> = {
  [PlatformType.META]: [
    'feed',
    'stories',
    'reels',
    'audience_network',
  ],
  [PlatformType.TIKTOK]: [
    'tiktok_feed',
    'tiktok_splash',
  ],
};

export const PLATFORM_OPTIMIZATION_GOALS: Record<
  CampaignGeneratorPlatform,
  string
> = {
  [PlatformType.META]: 'OFFSITE_CONVERSIONS',
  [PlatformType.TIKTOK]: 'CONVERT',
};

export const CREATIVE_ASPECT_RATIOS: Record<
  CreativeType,
  string[]
> = {
  [CreativeType.IMAGE]: ['1:1', '4:5', '9:16'],
  [CreativeType.VIDEO]: ['9:16', '1:1', '16:9'],
  [CreativeType.CAROUSEL]: ['1:1'],
  [CreativeType.COLLECTION]: ['1:1'],
  [CreativeType.SLIDESHOW]: ['1:1', '9:16'],
  [CreativeType.STORY]: ['9:16'],
  [CreativeType.MESSAGE]: ['1:1'],
  [CreativeType.INTERACTIVE]: ['1:1', '9:16'],
  [CreativeType.PLAYABLE]: ['9:16'],
  [CreativeType.AUDIO]: [],
  [CreativeType.TEXT]: [],
  [CreativeType.HTML5]: ['1:1', '9:16'],
  [CreativeType.NONE]: [],
};
