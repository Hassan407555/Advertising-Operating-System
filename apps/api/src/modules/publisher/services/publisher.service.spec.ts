import { BadRequestException } from '@nestjs/common';
import { PublisherService } from './publisher.service';
import { PublisherPlatform, PublishStatus } from '../enums/publisher.enums';

describe('PublisherService', () => {
  const currentUser = {
    sub: 'user_1',
    organizationId: 'org_1',
    email: 'test@example.com',
    role: 'ADMIN',
  };

  const DRAFT_AD_ACCOUNT_ID = 'local_draft_ad_account';
  const CONFIGURED_AD_ACCOUNT_ID = 'meta_configured_ad_account';

  function createService() {
    const provider = {
      validate: jest.fn().mockResolvedValue({
        valid: true,
        platform: PublisherPlatform.META,
        issues: [],
      }),
      publish: jest.fn().mockResolvedValue({
        success: true,
        platform: PublisherPlatform.META,
        status: PublishStatus.PUBLISHED,
        campaignId: 'campaign_1',
        entities: [],
        issues: [],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 1,
      }),
    };

    const registry = {
      get: jest.fn().mockReturnValue(provider),
      listRegistered: jest.fn().mockReturnValue([PublisherPlatform.META]),
      has: jest.fn().mockReturnValue(true),
    };

    const mapper = {
      toValidationResponse: jest.fn((input) => input),
      toPublishResponse: jest.fn((input) => input),
      toPlatformsResponse: jest.fn((input) => input),
    };

    const prisma = {
      campaign: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      storeAdvertisingConfiguration: {
        findUnique: jest.fn(),
      },
      adAccount: {
        findFirst: jest.fn(),
      },
      platformConnection: {
        findFirst: jest.fn(),
      },
      platformCredential: {
        findFirst: jest.fn(),
      },
      shopifyProduct: {
        findFirst: jest.fn(),
      },
      creative: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
    };

    const storesService = {
      assertMetaPublishReady: jest.fn().mockResolvedValue(undefined),
    };

    const service = new PublisherService(
      registry as never,
      mapper as never,
      prisma as never,
      storesService as never,
    );

    return { service, provider, prisma, storesService };
  }

  function mockReadyMetaCredentials(prisma: ReturnType<typeof createService>['prisma']) {
    prisma.adAccount.findFirst.mockResolvedValue({
      platformConnectionId: 'meta_conn_1',
    });
    prisma.platformConnection.findFirst.mockResolvedValue({ id: 'meta_conn_1' });
    prisma.platformCredential.findFirst.mockResolvedValue({
      id: 'cred_1',
      accessToken: 'encrypted-token',
    });
    prisma.shopifyProduct.findFirst.mockResolvedValue(null);
  }

  it('injects pageId from store advertising configuration for validation', async () => {
    const { service, provider, prisma, storesService } = createService();

    prisma.campaign.findFirst
      .mockResolvedValueOnce({ shopifyStoreId: 'store_1' })
      .mockResolvedValueOnce({ shopifyStoreId: 'store_1' })
      .mockResolvedValueOnce({
        id: 'campaign_1',
        shopifyStoreId: 'store_1',
        adAccountId: 'ad_account_1',
      })
      .mockResolvedValueOnce({
        shopifyStoreId: 'store_1',
        metadata: { productId: 'product_1' },
      });
    prisma.storeAdvertisingConfiguration.findUnique.mockResolvedValue({
      facebookPageId: '123456789',
      adAccountId: 'ad_account_1',
    });
    mockReadyMetaCredentials(prisma);

    await service.validate(
      {
        campaignId: 'campaign_1',
        organizationId: 'org_1',
        platform: PublisherPlatform.META,
        adAccountId: 'ad_account_1',
        options: { dryRun: false },
      },
      currentUser as never,
    );

    expect(storesService.assertMetaPublishReady).toHaveBeenCalled();
    expect(prisma.campaign.update).not.toHaveBeenCalled();
    expect(provider.validate).toHaveBeenCalledWith(
      expect.objectContaining({
        adAccountId: 'ad_account_1',
        options: expect.objectContaining({
          pageId: '123456789',
        }),
      }),
    );
  });

  it('blocks provider when selected ad account has no active meta credentials', async () => {
    const { service, provider, prisma } = createService();

    prisma.campaign.findFirst
      .mockResolvedValueOnce({ shopifyStoreId: 'store_1' })
      .mockResolvedValueOnce({ shopifyStoreId: 'store_1' })
      .mockResolvedValueOnce({
        id: 'campaign_1',
        shopifyStoreId: 'store_1',
        adAccountId: 'ad_account_1',
      });
    prisma.storeAdvertisingConfiguration.findUnique.mockResolvedValue({
      facebookPageId: '123456789',
      adAccountId: 'ad_account_1',
    });
    prisma.adAccount.findFirst.mockResolvedValue({
      platformConnectionId: 'meta_conn_1',
    });
    prisma.platformConnection.findFirst.mockResolvedValue({ id: 'meta_conn_1' });
    prisma.platformCredential.findFirst.mockResolvedValue(null);

    await expect(
      service.validate(
        {
          campaignId: 'campaign_1',
          organizationId: 'org_1',
          platform: PublisherPlatform.META,
          adAccountId: 'ad_account_1',
          options: { dryRun: false },
        },
        currentUser as never,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(provider.validate).not.toHaveBeenCalled();
  });

  it('publishes without explicit pageId when store has facebook page selected', async () => {
    const { service, provider, prisma } = createService();

    prisma.campaign.findFirst
      .mockResolvedValueOnce({ shopifyStoreId: 'store_1' })
      .mockResolvedValueOnce({ shopifyStoreId: 'store_1' })
      .mockResolvedValueOnce({
        id: 'campaign_1',
        shopifyStoreId: 'store_1',
        adAccountId: 'ad_account_1',
      })
      .mockResolvedValueOnce({
        shopifyStoreId: 'store_1',
        metadata: { productId: 'product_1' },
      });
    prisma.storeAdvertisingConfiguration.findUnique.mockResolvedValue({
      facebookPageId: '123456789',
      adAccountId: 'ad_account_1',
    });
    mockReadyMetaCredentials(prisma);

    await service.publish(
      {
        campaignId: 'campaign_1',
        organizationId: 'org_1',
        platform: PublisherPlatform.META,
        adAccountId: 'ad_account_1',
        options: { dryRun: false },
      },
      currentUser as never,
    );

    expect(provider.validate).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ pageId: '123456789' }),
      }),
    );
    expect(provider.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ pageId: '123456789' }),
      }),
    );
  });

  it('reconciles draft campaign ad account from store config before credential checks and provider validation', async () => {
    const { service, provider, prisma } = createService();

    prisma.campaign.findFirst
      .mockResolvedValueOnce({ shopifyStoreId: 'store_1' })
      .mockResolvedValueOnce({ shopifyStoreId: 'store_1' })
      .mockResolvedValueOnce({
        id: 'campaign_1',
        shopifyStoreId: 'store_1',
        adAccountId: DRAFT_AD_ACCOUNT_ID,
      })
      .mockResolvedValueOnce({
        shopifyStoreId: 'store_1',
        metadata: { productId: 'product_1' },
      });
    prisma.storeAdvertisingConfiguration.findUnique.mockResolvedValue({
      facebookPageId: '123456789',
      adAccountId: CONFIGURED_AD_ACCOUNT_ID,
    });
    mockReadyMetaCredentials(prisma);

    await service.publish(
      {
        campaignId: 'campaign_1',
        organizationId: 'org_1',
        platform: PublisherPlatform.META,
        adAccountId: DRAFT_AD_ACCOUNT_ID,
        options: { dryRun: false },
      },
      currentUser as never,
    );

    expect(prisma.campaign.update).toHaveBeenCalledWith({
      where: { id: 'campaign_1' },
      data: { adAccountId: CONFIGURED_AD_ACCOUNT_ID },
    });
    expect(prisma.adAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: CONFIGURED_AD_ACCOUNT_ID,
        }),
      }),
    );
    expect(provider.validate).toHaveBeenCalledWith(
      expect.objectContaining({
        adAccountId: CONFIGURED_AD_ACCOUNT_ID,
      }),
    );
    expect(provider.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        adAccountId: CONFIGURED_AD_ACCOUNT_ID,
      }),
    );
  });

  it('leaves campaign ad account unchanged when it already matches store configuration', async () => {
    const { service, provider, prisma } = createService();

    prisma.campaign.findFirst
      .mockResolvedValueOnce({ shopifyStoreId: 'store_1' })
      .mockResolvedValueOnce({ shopifyStoreId: 'store_1' })
      .mockResolvedValueOnce({
        id: 'campaign_1',
        shopifyStoreId: 'store_1',
        adAccountId: CONFIGURED_AD_ACCOUNT_ID,
      })
      .mockResolvedValueOnce({
        shopifyStoreId: 'store_1',
        metadata: { productId: 'product_1' },
      });
    prisma.storeAdvertisingConfiguration.findUnique.mockResolvedValue({
      facebookPageId: '123456789',
      adAccountId: CONFIGURED_AD_ACCOUNT_ID,
    });
    mockReadyMetaCredentials(prisma);

    await service.validate(
      {
        campaignId: 'campaign_1',
        organizationId: 'org_1',
        platform: PublisherPlatform.META,
        adAccountId: DRAFT_AD_ACCOUNT_ID,
        options: { dryRun: false },
      },
      currentUser as never,
    );

    expect(prisma.campaign.update).not.toHaveBeenCalled();
    expect(provider.validate).toHaveBeenCalledWith(
      expect.objectContaining({
        adAccountId: CONFIGURED_AD_ACCOUNT_ID,
      }),
    );
  });

  it('does not reconcile when store advertising configuration has no ad account', async () => {
    const { service, provider, prisma } = createService();

    prisma.campaign.findFirst
      .mockResolvedValueOnce({ shopifyStoreId: 'store_1' })
      .mockResolvedValueOnce({ shopifyStoreId: 'store_1' })
      .mockResolvedValueOnce({
        id: 'campaign_1',
        shopifyStoreId: 'store_1',
        adAccountId: DRAFT_AD_ACCOUNT_ID,
      })
      .mockResolvedValueOnce({
        shopifyStoreId: 'store_1',
        metadata: { productId: 'product_1' },
      });
    prisma.storeAdvertisingConfiguration.findUnique.mockResolvedValue({
      facebookPageId: '123456789',
      adAccountId: null,
    });
    mockReadyMetaCredentials(prisma);

    await service.validate(
      {
        campaignId: 'campaign_1',
        organizationId: 'org_1',
        platform: PublisherPlatform.META,
        adAccountId: DRAFT_AD_ACCOUNT_ID,
        options: { dryRun: false },
      },
      currentUser as never,
    );

    expect(prisma.campaign.update).not.toHaveBeenCalled();
    expect(provider.validate).toHaveBeenCalledWith(
      expect.objectContaining({
        adAccountId: DRAFT_AD_ACCOUNT_ID,
      }),
    );
  });
});
