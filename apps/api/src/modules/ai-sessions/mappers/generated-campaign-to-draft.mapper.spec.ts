import { mapGeneratedCampaignToDraft } from './generated-campaign-to-draft.mapper';
import { CreativeType } from '@prisma/client';

describe('mapGeneratedCampaignToDraft', () => {
  const baseSource = {
    organizationId: 'org_1',
    aiSessionId: 'session_1',
    shopifyStoreId: 'store_1',
    productId: 'product_1',
    adAccountId: 'ad_account_1',
  };

  it('maps NONE to CreativeType.NONE with requiresCreative=false', () => {
    const mapped = mapGeneratedCampaignToDraft({
      ...baseSource,
      campaignType: 'NONE',
      payload: {
        campaignType: 'NONE',
        campaignName: 'Deferred Creative Campaign',
        objective: 'TRAFFIC',
        audience: 'US shoppers',
        budget: { dailyBudget: 25, currency: 'USD' },
        cta: 'LEARN_MORE',
        requiresCreative: false,
        creativeNotes: 'Use existing page post later',
        existingPostId: '111_222',
      },
    });

    expect(mapped.creative.type).toBe(CreativeType.NONE);
    expect(mapped.creative.metadata).toMatchObject({
      requiresCreative: false,
      existingPostId: '111_222',
      creativeNotes: 'Use existing page post later',
    });
    expect(mapped.campaign.metadata).toMatchObject({
      requiresCreative: false,
      campaignType: 'NONE',
    });
    expect(mapped.ad.metadata).toMatchObject({
      requiresCreative: false,
    });
  });

  it('still maps IMAGE creatives unchanged', () => {
    const mapped = mapGeneratedCampaignToDraft({
      ...baseSource,
      campaignType: 'IMAGE',
      payload: {
        campaignType: 'IMAGE',
        campaignName: 'Image Campaign',
        objective: 'SALES',
        audience: 'US shoppers',
        budget: { dailyBudget: 50 },
        headlines: ['Buy now'],
        primaryText: 'Primary',
        description: 'Desc',
        cta: 'SHOP_NOW',
        creativeBrief: 'Brief',
      },
    });

    expect(mapped.creative.type).toBe(CreativeType.IMAGE);
    expect(mapped.creative.headline).toBe('Buy now');
    expect(mapped.campaign.metadata.requiresCreative).toBeUndefined();
  });
});
