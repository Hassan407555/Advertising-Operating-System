import { BadRequestException } from '@nestjs/common';

import {
  schemaHintForCampaignType,
  validateGeneratedCampaign,
} from './generated-campaign.schema';

describe('validateGeneratedCampaign', () => {
  const shared = {
    campaignName: 'Summer Promo',
    objective: 'CONVERSIONS',
    audience: 'US shoppers 25-45',
    budget: { dailyBudget: 40, currency: 'USD' },
    cta: 'SHOP_NOW',
  };

  it('accepts IMAGE payloads', () => {
    const result = validateGeneratedCampaign('IMAGE', {
      ...shared,
      headlines: ['Headline A'],
      primaryText: 'Primary',
      description: 'Desc',
      creativeBrief: 'Hook: ... Pain Points: ... Benefits: ... Offer: ... Tone of Voice: ...',
    });
    expect(result.campaignType).toBe('IMAGE');
  });

  it('accepts CAROUSEL payloads', () => {
    const result = validateGeneratedCampaign('CAROUSEL', {
      ...shared,
      cardTitles: ['A', 'B'],
      cardDescriptions: ['a', 'b'],
      cardOrder: [1, 2],
      creativeStrategy: 'Hook: ...',
    });
    expect(result.campaignType).toBe('CAROUSEL');
  });

  it('accepts VIDEO payloads', () => {
    const result = validateGeneratedCampaign('VIDEO', {
      ...shared,
      hook: 'Hook',
      videoScript: 'Script',
      storyboard: ['Shot 1'],
      shotList: ['Close-up'],
    });
    expect(result.campaignType).toBe('VIDEO');
  });

  it('accepts NONE payloads and forces requiresCreative=false', () => {
    const result = validateGeneratedCampaign('NONE', {
      ...shared,
      creativeNotes: 'Attach creative later',
      existingPostId: '123_456',
    });
    expect(result).toMatchObject({
      campaignType: 'NONE',
      requiresCreative: false,
      creativeNotes: 'Attach creative later',
      existingPostId: '123_456',
    });
  });

  it('rejects NONE when requiresCreative is true', () => {
    expect(() =>
      validateGeneratedCampaign('NONE', {
        ...shared,
        requiresCreative: true,
      }),
    ).toThrow(BadRequestException);
  });

  it('schema hint for NONE includes requiresCreative', () => {
    expect(schemaHintForCampaignType('NONE')).toContain('requiresCreative');
  });
});
