import {
  CreativeType,
  type CallToAction,
  type CampaignObjective,
  type Currency,
  type Prisma,
} from '@prisma/client';

import type {
  GeneratedCampaignPayload,
  GeneratedCarouselCampaign,
  GeneratedImageCampaign,
  GeneratedVideoCampaign,
  MetaCampaignAdType,
} from '../types/generated-campaign.types';
import {
  mapCallToAction,
  mapCurrency,
  mapObjective,
} from '../utils/meta-enum.mappers';

export interface DraftEntitySource {
  organizationId: string;
  aiSessionId: string;
  shopifyStoreId: string;
  productId: string;
  adAccountId: string;
  campaignType: MetaCampaignAdType;
  payload: GeneratedCampaignPayload;
}

export interface MappedDraftEntities {
  campaign: {
    name: string;
    objective: CampaignObjective;
    dailyBudget: number;
    currency: Currency;
    shopifyStoreId: string;
    metadata: Record<string, unknown>;
  };
  adSet: {
    name: string;
    targeting: Record<string, unknown>;
    metadata: Record<string, unknown>;
  };
  creative: {
    name: string;
    type: CreativeType;
    headline: string | null;
    primaryText: string | null;
    description: string | null;
    callToAction: CallToAction;
    metadata: Record<string, unknown>;
  };
  ad: {
    name: string;
    metadata: Record<string, unknown>;
  };
}

function baseMetadata(source: DraftEntitySource): Record<string, unknown> {
  return {
    source: 'ai-session',
    aiSessionId: source.aiSessionId,
    shopifyStoreId: source.shopifyStoreId,
    productId: source.productId,
    campaignType: source.campaignType,
  };
}

function mapImageCreative(
  payload: GeneratedImageCampaign,
  meta: Record<string, unknown>,
): MappedDraftEntities['creative'] {
  return {
    name: `${payload.campaignName} Creative`,
    type: CreativeType.IMAGE,
    headline: payload.headlines[0] ?? null,
    primaryText: payload.primaryText,
    description: payload.description,
    callToAction: mapCallToAction(payload.cta),
    metadata: {
      ...meta,
      headlines: payload.headlines,
      creativeBrief: payload.creativeBrief,
    },
  };
}

function mapCarouselCreative(
  payload: GeneratedCarouselCampaign,
  meta: Record<string, unknown>,
): MappedDraftEntities['creative'] {
  return {
    name: `${payload.campaignName} Creative`,
    type: CreativeType.CAROUSEL,
    headline: payload.cardTitles[0] ?? null,
    primaryText: payload.cardDescriptions[0] ?? null,
    description: null,
    callToAction: mapCallToAction(payload.cta),
    metadata: {
      ...meta,
      carousel: {
        cardTitles: payload.cardTitles,
        cardDescriptions: payload.cardDescriptions,
        cardOrder: payload.cardOrder,
        creativeStrategy: payload.creativeStrategy,
      },
    },
  };
}

function mapVideoCreative(
  payload: GeneratedVideoCampaign,
  meta: Record<string, unknown>,
): MappedDraftEntities['creative'] {
  return {
    name: `${payload.campaignName} Creative`,
    type: CreativeType.VIDEO,
    headline: payload.hook,
    primaryText: payload.videoScript,
    description: null,
    callToAction: mapCallToAction(payload.cta),
    metadata: {
      ...meta,
      video: {
        hook: payload.hook,
        videoScript: payload.videoScript,
        storyboard: payload.storyboard,
        shotList: payload.shotList,
      },
    },
  };
}

/**
 * Maps reviewed generatedCampaign payload into Campaign / AdSet / Ad / Creative fields.
 * Budget is stored on Campaign only (not duplicated on AdSet).
 */
export function mapGeneratedCampaignToDraft(
  source: DraftEntitySource,
): MappedDraftEntities {
  const meta = baseMetadata(source);
  const payload = source.payload;

  let creative: MappedDraftEntities['creative'];
  if (payload.campaignType === 'IMAGE') {
    creative = mapImageCreative(payload, meta);
  } else if (payload.campaignType === 'CAROUSEL') {
    creative = mapCarouselCreative(payload, meta);
  } else {
    creative = mapVideoCreative(payload, meta);
  }

  return {
    campaign: {
      name: payload.campaignName,
      objective: mapObjective(payload.objective),
      dailyBudget: payload.budget.dailyBudget,
      currency: mapCurrency(payload.budget.currency),
      shopifyStoreId: source.shopifyStoreId,
      metadata: {
        ...meta,
        audience: payload.audience,
        objectiveText: payload.objective,
        ctaText: payload.cta,
      },
    },
    adSet: {
      name: `${payload.campaignName} Ad Set`,
      targeting: {
        summary: payload.audience,
      },
      metadata: {
        ...meta,
        audience: payload.audience,
      },
    },
    creative,
    ad: {
      name: `${payload.campaignName} Ad`,
      metadata: { ...meta },
    },
  };
}

export function asPrismaJson(
  value: Record<string, unknown>,
): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
