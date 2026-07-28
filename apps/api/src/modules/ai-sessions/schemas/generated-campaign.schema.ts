import { BadRequestException } from '@nestjs/common';

import type {
  GeneratedCampaignPayload,
  GeneratedCarouselCampaign,
  GeneratedImageCampaign,
  GeneratedVideoCampaign,
  MetaCampaignAdType,
} from '../types/generated-campaign.types';

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(
      `Invalid campaign JSON: "${field}" must be a non-empty string.`,
    );
  }
  return value.trim();
}

function requireStringArray(value: unknown, field: string, min = 1): string[] {
  if (!Array.isArray(value) || value.length < min) {
    throw new BadRequestException(
      `Invalid campaign JSON: "${field}" must be an array with at least ${min} item(s).`,
    );
  }
  return value.map((item, index) =>
    requireString(item, `${field}[${index}]`),
  );
}

function requireNumberArray(value: unknown, field: string, min = 1): number[] {
  if (!Array.isArray(value) || value.length < min) {
    throw new BadRequestException(
      `Invalid campaign JSON: "${field}" must be an array with at least ${min} number(s).`,
    );
  }
  return value.map((item, index) => {
    const num = typeof item === 'number' ? item : Number(item);
    if (!Number.isFinite(num)) {
      throw new BadRequestException(
        `Invalid campaign JSON: "${field}[${index}]" must be a number.`,
      );
    }
    return num;
  });
}

function requireBudget(value: unknown): { dailyBudget: number; currency?: string } {
  if (!value || typeof value !== 'object') {
    throw new BadRequestException(
      'Invalid campaign JSON: "budget" must be an object with dailyBudget.',
    );
  }

  const record = value as Record<string, unknown>;
  const dailyBudget = Number(record.dailyBudget);
  if (!Number.isFinite(dailyBudget) || dailyBudget <= 0) {
    throw new BadRequestException(
      'Invalid campaign JSON: "budget.dailyBudget" must be a positive number.',
    );
  }

  const currency =
    typeof record.currency === 'string' && record.currency.trim()
      ? record.currency.trim()
      : undefined;

  return { dailyBudget, currency };
}

function requireSharedFields(raw: Record<string, unknown>) {
  return {
    campaignName: requireString(raw.campaignName, 'campaignName'),
    objective: requireString(raw.objective, 'objective'),
    audience: requireString(raw.audience, 'audience'),
    budget: requireBudget(raw.budget),
    cta: requireString(raw.cta ?? raw.CTA, 'cta'),
  };
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BadRequestException(
      'Invalid campaign JSON: expected a JSON object.',
    );
  }
  return raw as Record<string, unknown>;
}

function validateImageCampaign(
  raw: Record<string, unknown>,
): GeneratedImageCampaign {
  const shared = requireSharedFields(raw);
  const headlines =
    raw.headlines !== undefined
      ? requireStringArray(raw.headlines, 'headlines')
      : [requireString(raw.headline, 'headline')];

  return {
    campaignType: 'IMAGE',
    ...shared,
    headlines,
    primaryText: requireString(raw.primaryText, 'primaryText'),
    description: requireString(raw.description, 'description'),
    creativeBrief: requireString(raw.creativeBrief, 'creativeBrief'),
  };
}

function validateCarouselCampaign(
  raw: Record<string, unknown>,
): GeneratedCarouselCampaign {
  const shared = requireSharedFields(raw);
  const cardTitles = requireStringArray(raw.cardTitles, 'cardTitles');
  const cardDescriptions = requireStringArray(
    raw.cardDescriptions,
    'cardDescriptions',
  );

  if (cardTitles.length !== cardDescriptions.length) {
    throw new BadRequestException(
      'Invalid campaign JSON: cardTitles and cardDescriptions must have the same length.',
    );
  }

  const cardOrder =
    raw.cardOrder !== undefined
      ? requireNumberArray(raw.cardOrder, 'cardOrder', cardTitles.length)
      : cardTitles.map((_, index) => index + 1);

  if (cardOrder.length !== cardTitles.length) {
    throw new BadRequestException(
      'Invalid campaign JSON: cardOrder length must match cardTitles.',
    );
  }

  return {
    campaignType: 'CAROUSEL',
    ...shared,
    cardTitles,
    cardDescriptions,
    cardOrder,
    creativeStrategy: requireString(
      raw.creativeStrategy ?? raw.carouselStrategy,
      'creativeStrategy',
    ),
  };
}

function validateVideoCampaign(
  raw: Record<string, unknown>,
): GeneratedVideoCampaign {
  const shared = requireSharedFields(raw);

  return {
    campaignType: 'VIDEO',
    ...shared,
    hook: requireString(raw.hook, 'hook'),
    videoScript: requireString(raw.videoScript, 'videoScript'),
    storyboard: requireStringArray(raw.storyboard, 'storyboard'),
    shotList: requireStringArray(raw.shotList, 'shotList'),
  };
}

/**
 * Validates Gemini JSON against the expected campaign type.
 * Throws BadRequestException on any invalid/partial payload.
 */
export function validateGeneratedCampaign(
  campaignType: MetaCampaignAdType,
  raw: unknown,
): GeneratedCampaignPayload {
  const record = asRecord(raw);

  switch (campaignType) {
    case 'IMAGE':
      return validateImageCampaign(record);
    case 'CAROUSEL':
      return validateCarouselCampaign(record);
    case 'VIDEO':
      return validateVideoCampaign(record);
    default:
      throw new BadRequestException(
        `Unsupported campaign type for validation: ${String(campaignType)}`,
      );
  }
}

export function schemaHintForCampaignType(campaignType: MetaCampaignAdType): string {
  if (campaignType === 'IMAGE') {
    return `{
  "campaignName": string,
  "objective": string,
  "audience": string,
  "budget": { "dailyBudget": number, "currency"?: string },
  "headlines": string[],
  "primaryText": string,
  "description": string,
  "cta": string,
  "creativeBrief": string
}`;
  }

  if (campaignType === 'CAROUSEL') {
    return `{
  "campaignName": string,
  "objective": string,
  "audience": string,
  "budget": { "dailyBudget": number, "currency"?: string },
  "cardTitles": string[],
  "cardDescriptions": string[],
  "cardOrder": number[],
  "cta": string,
  "creativeStrategy": string
}`;
  }

  return `{
  "campaignName": string,
  "objective": string,
  "audience": string,
  "budget": { "dailyBudget": number, "currency"?: string },
  "hook": string,
  "videoScript": string,
  "storyboard": string[],
  "shotList": string[],
  "cta": string
}`;
}
