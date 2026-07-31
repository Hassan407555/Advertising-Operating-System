import { CreativeType } from '@prisma/client';
import { SaveDraftCampaignService } from './save-draft-campaign.service';

describe('SaveDraftCampaignService', () => {
  function createService() {
    const prisma = {
      shopifyProduct: { findFirst: jest.fn() },
      platformConnection: { findFirst: jest.fn() },
    };
    const storesService = {};
    const auditLogsService = {};

    const service = new SaveDraftCampaignService(
      prisma as never,
      storesService as never,
      auditLogsService as never,
      { linkVideoAssetToCreative: jest.fn() } as never,
    );

    return { service, prisma };
  }

  it('fills sourceImageUrls and featuredImageUrl when absent', () => {
    const { service } = createService();

    const result = (service as any).applyCreativeFallback(
      { source: 'ai-session' },
      null,
      {
        sourceImageUrls: ['https://cdn.shop.com/img-1.jpg'],
        featuredImageUrl: 'https://cdn.shop.com/featured.jpg',
        landingPageUrl: 'https://shop.example.com/products/espresso',
      },
    );

    expect(result.metadata.sourceImageUrls).toEqual([
      'https://cdn.shop.com/img-1.jpg',
    ]);
    expect(result.metadata.featuredImageUrl).toBe(
      'https://cdn.shop.com/featured.jpg',
    );
    expect(result.landingPageUrl).toBe(
      'https://shop.example.com/products/espresso',
    );
  });

  it('does not overwrite existing image metadata', () => {
    const { service } = createService();

    const result = (service as any).applyCreativeFallback(
      { source: 'ai-session' },
      {
        sourceImageUrls: ['https://existing.example.com/source.jpg'],
        featuredImageUrl: 'https://existing.example.com/featured.jpg',
      },
      {
        sourceImageUrls: ['https://new.example.com/source.jpg'],
        featuredImageUrl: 'https://new.example.com/featured.jpg',
        landingPageUrl: 'https://shop.example.com/products/espresso',
      },
    );

    expect(result.metadata.sourceImageUrls).toEqual([
      'https://existing.example.com/source.jpg',
    ]);
    expect(result.metadata.featuredImageUrl).toBe(
      'https://existing.example.com/featured.jpg',
    );
  });

  it('skips product image fallbacks for NONE creatives', () => {
    const { service } = createService();

    const fallback = (service as any).fallbackForCreativeType(
      CreativeType.NONE,
      {
        sourceImageUrls: ['https://cdn.shop.com/img-1.jpg'],
        featuredImageUrl: 'https://cdn.shop.com/featured.jpg',
        landingPageUrl: 'https://shop.example.com/products/espresso',
      },
    );

    expect(fallback.sourceImageUrls).toEqual([]);
    expect(fallback.featuredImageUrl).toBeNull();
    expect(fallback.landingPageUrl).toBe(
      'https://shop.example.com/products/espresso',
    );
  });

  it('resolves landing URL from store domain and product handle', async () => {
    const { service, prisma } = createService();

    prisma.shopifyProduct.findFirst.mockResolvedValue({
      handle: 'espresso-beans',
      featuredImageUrl: 'https://cdn.shop.com/featured.jpg',
      images: [{ url: 'https://cdn.shop.com/img-1.jpg' }],
    });
    prisma.platformConnection.findFirst.mockResolvedValue({
      accountId: 'example-store.myshopify.com',
      externalName: null,
    });

    const fallback = await (service as any).resolveCreativeFallback(
      'org_1',
      'store_1',
      'product_1',
    );

    expect(fallback.sourceImageUrls).toEqual([
      'https://cdn.shop.com/img-1.jpg',
    ]);
    expect(fallback.featuredImageUrl).toBe('https://cdn.shop.com/featured.jpg');
    expect(fallback.landingPageUrl).toBe(
      'https://example-store.myshopify.com/products/espresso-beans',
    );
  });

  it('persists landingPageUrl and media fields on draft creative create', async () => {
    const { service } = createService();
    const tx = {
      creative: {
        create: jest.fn().mockResolvedValue({ id: 'creative_1' }),
      },
      campaign: {
        create: jest.fn().mockResolvedValue({ id: 'campaign_1' }),
      },
      adSet: {
        create: jest.fn().mockResolvedValue({ id: 'adset_1' }),
      },
      ad: {
        create: jest.fn().mockResolvedValue({ id: 'ad_1' }),
      },
    };

    await (service as any).createDraftEntities(
      tx,
      {
        id: 'session_1',
        organizationId: 'org_1',
      },
      'ad_account_1',
      {
        campaign: {
          shopifyStoreId: 'store_1',
          name: 'Campaign',
          objective: 'SALES',
          dailyBudget: 10,
          currency: 'USD',
          metadata: {},
        },
        adSet: { name: 'AdSet', targeting: {}, metadata: {} },
        ad: { name: 'Ad', metadata: {} },
        creative: {
          name: 'Creative',
          type: CreativeType.IMAGE,
          headline: 'Headline',
          primaryText: 'Primary',
          description: 'Description',
          callToAction: 'SHOP_NOW',
          metadata: {},
        },
      },
      {
        sourceImageUrls: ['https://cdn.shop.com/img-1.jpg'],
        featuredImageUrl: 'https://cdn.shop.com/featured.jpg',
        landingPageUrl: 'https://shop.example.com/products/espresso',
      },
    );

    expect(tx.creative.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          landingPageUrl: 'https://shop.example.com/products/espresso',
          metadata: expect.objectContaining({
            sourceImageUrls: ['https://cdn.shop.com/img-1.jpg'],
            featuredImageUrl: 'https://cdn.shop.com/featured.jpg',
          }),
        }),
      }),
    );
  });
});
