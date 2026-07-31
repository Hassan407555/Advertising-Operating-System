import { CreativeType } from '@prisma/client';

import { PublishEntityType } from '../../../enums/publisher.enums';
import { MetaCreativePublishStrategyFactory } from './creative-publish.strategy.factory';
import type { MetaCreativePublishContext } from './creative-publish.strategy';
import { NoneCreativePublishStrategy } from './none-creative.publish.strategy';

function baseCreative(overrides: Record<string, unknown> = {}) {
  return {
    id: 'creative_1',
    name: 'Deferred Creative',
    type: CreativeType.NONE,
    headline: null,
    primaryText: null,
    description: null,
    callToAction: null,
    landingPageUrl: 'https://shop.example.com/products/tea',
    metadata: { requiresCreative: false },
    ...overrides,
  } as never;
}

function baseContext(
  overrides: Partial<MetaCreativePublishContext> = {},
): MetaCreativePublishContext {
  return {
    adAccountExternalId: 'act_1',
    accessToken: 'token',
    pageId: 'page_1',
    dryRun: false,
    videoByCreativeId: new Map(),
    stageTracker: {
      mark: jest.fn(),
      run: jest.fn(async (_stage, _meta, fn) => fn()),
    } as never,
    metaGraphClient: {
      createAdCreative: jest.fn().mockResolvedValue({ id: 'meta_creative_new' }),
      uploadVideoByUrl: jest.fn(),
    } as never,
    resolveImageUrl: jest.fn().mockReturnValue(null),
    ctaMap: { SHOP_NOW: 'SHOP_NOW' },
    defaultCta: 'SHOP_NOW' as never,
    supportedVideoMimeTypes: ['video/mp4'],
    ...overrides,
  };
}

describe('NoneCreativePublishStrategy', () => {
  const strategy = new NoneCreativePublishStrategy();

  it('does not require image, video, or AI copy', () => {
    const issues = strategy.validate(baseCreative(), baseContext(), 'ad_1');
    expect(issues).toEqual([]);
  });

  it('requires landingPageUrl when no existing Meta IDs are present', () => {
    const issues = strategy.validate(
      baseCreative({ landingPageUrl: null }),
      baseContext(),
      'ad_1',
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MISSING_LANDING_URL',
          entityType: PublishEntityType.CREATIVE,
        }),
      ]),
    );
  });

  it('skips landing URL when existingCreativeId is set', () => {
    const issues = strategy.validate(
      baseCreative({
        landingPageUrl: null,
        metadata: { existingCreativeId: 'meta_existing_1' },
      }),
      baseContext(),
      'ad_1',
    );
    expect(issues).toEqual([]);
  });

  it('reuses existingCreativeId without creating media', async () => {
    const context = baseContext();
    const id = await strategy.publish(
      baseCreative({
        metadata: { existingCreativeId: 'meta_existing_1' },
      }),
      context,
    );
    expect(id).toBe('meta_existing_1');
    expect(context.metaGraphClient.createAdCreative).not.toHaveBeenCalled();
  });

  it('creates object_story_id creative for existingPostId', async () => {
    const context = baseContext();
    const id = await strategy.publish(
      baseCreative({
        metadata: { existingPostId: 'page_post_99' },
      }),
      context,
    );
    expect(id).toBe('meta_creative_new');
    expect(context.metaGraphClient.createAdCreative).toHaveBeenCalledWith(
      'act_1',
      'token',
      expect.objectContaining({
        object_story_id: 'page_post_99',
      }),
    );
  });

  it('creates link-only object_story_spec without picture/video', async () => {
    const context = baseContext();
    await strategy.publish(baseCreative(), context);
    expect(context.metaGraphClient.createAdCreative).toHaveBeenCalledWith(
      'act_1',
      'token',
      expect.objectContaining({
        object_story_spec: expect.objectContaining({
          page_id: 'page_1',
          link_data: expect.not.objectContaining({
            picture: expect.anything(),
          }),
        }),
      }),
    );
  });
});

describe('MetaCreativePublishStrategyFactory', () => {
  const factory = new MetaCreativePublishStrategyFactory();

  it.each([
    CreativeType.IMAGE,
    CreativeType.TEXT,
    CreativeType.VIDEO,
    CreativeType.NONE,
  ] as const)('supports %s', (type) => {
    expect(factory.supports(type)).toBe(true);
    expect(factory.get(type)?.type).toBe(type);
  });

  it('does not support CAROUSEL in Meta V1', () => {
    expect(factory.supports(CreativeType.CAROUSEL)).toBe(false);
  });
});
