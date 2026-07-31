/**
 * QA seed focused on Advertising Configuration.
 * Uses hassan@gmail.com org. Records tagged [QA SEED] / [QA ADV].
 *
 * Scenarios:
 * - Store Alpha: full advertising-ready config
 * - Store Beta: products synced, NO advertising config (not ready)
 * - Second Meta connection + second Ad Account for selector options
 */
const {
  PrismaClient,
  PlatformType,
  ConnectionStatus,
  SyncStatus,
  ShopifyProductStatus,
  Currency,
  AdAccountStatus,
} = require('@prisma/client');

const prisma = new PrismaClient();

const ORG_ID = 'cms5nhfz90000i008bhjg7ac4';
const USER_ID = 'aabf5b43-adaa-402a-b47c-09543d11665a';

async function main() {
  const org = await prisma.organization.findUnique({ where: { id: ORG_ID } });
  if (!org) {
    throw new Error(`Organization ${ORG_ID} not found. Register hassan@gmail.com first.`);
  }

  // Cleanup prior adv-config QA extras (keep product seed stores if present)
  await prisma.storeAdvertisingConfiguration.deleteMany({
    where: { organizationId: ORG_ID },
  });
  await prisma.adAccount.deleteMany({
    where: {
      organizationId: ORG_ID,
      OR: [
        { accountName: { startsWith: '[QA SEED]' } },
        { accountName: { startsWith: '[QA ADV]' } },
      ],
    },
  });
  await prisma.platformConnection.deleteMany({
    where: {
      organizationId: ORG_ID,
      OR: [
        { accountName: { startsWith: '[QA SEED]' } },
        { accountName: { startsWith: '[QA ADV]' } },
      ],
    },
  });
  await prisma.shopifyProduct.deleteMany({
    where: {
      organizationId: ORG_ID,
      OR: [
        { title: { startsWith: '[QA SEED]' } },
        { title: { startsWith: '[QA ADV]' } },
        { handle: { startsWith: 'qa-seed-' } },
        { handle: { startsWith: 'qa-adv-' } },
      ],
    },
  });

  const now = new Date();

  const shopifyA = await prisma.platformConnection.create({
    data: {
      organizationId: ORG_ID,
      createdByUserId: USER_ID,
      platform: PlatformType.SHOPIFY,
      accountId: 'qa-adv-store-a.myshopify.com',
      accountName: '[QA ADV] Store Alpha',
      status: ConnectionStatus.ACTIVE,
      syncStatus: SyncStatus.SYNCED,
      lastSyncedAt: now,
      lastSuccessfulSyncAt: now,
    },
  });

  const shopifyB = await prisma.platformConnection.create({
    data: {
      organizationId: ORG_ID,
      createdByUserId: USER_ID,
      platform: PlatformType.SHOPIFY,
      accountId: 'qa-adv-store-b.myshopify.com',
      accountName: '[QA ADV] Store Beta',
      status: ConnectionStatus.ACTIVE,
      syncStatus: SyncStatus.SYNCED,
      lastSyncedAt: now,
      lastSuccessfulSyncAt: now,
    },
  });

  const metaPrimary = await prisma.platformConnection.create({
    data: {
      organizationId: ORG_ID,
      createdByUserId: USER_ID,
      platform: PlatformType.META,
      accountId: 'qa-adv-meta-primary',
      accountName: '[QA ADV] Meta Primary',
      status: ConnectionStatus.ACTIVE,
      syncStatus: SyncStatus.SYNCED,
      lastSyncedAt: now,
      lastSuccessfulSyncAt: now,
    },
  });

  const metaSecondary = await prisma.platformConnection.create({
    data: {
      organizationId: ORG_ID,
      createdByUserId: USER_ID,
      platform: PlatformType.META,
      accountId: 'qa-adv-meta-secondary',
      accountName: '[QA ADV] Meta Secondary',
      status: ConnectionStatus.ACTIVE,
      syncStatus: SyncStatus.SYNCED,
      lastSyncedAt: now,
      lastSuccessfulSyncAt: now,
    },
  });

  const adAccountPrimary = await prisma.adAccount.create({
    data: {
      organizationId: ORG_ID,
      platformConnectionId: metaPrimary.id,
      platform: PlatformType.META,
      externalId: 'qa-adv-ad-account-1',
      accountName: '[QA ADV] Ad Account One',
      currency: Currency.USD,
      timezone: 'UTC',
      status: AdAccountStatus.ACTIVE,
      isActive: true,
    },
  });

  const adAccountSecondary = await prisma.adAccount.create({
    data: {
      organizationId: ORG_ID,
      platformConnectionId: metaSecondary.id,
      platform: PlatformType.META,
      externalId: 'qa-adv-ad-account-2',
      accountName: '[QA ADV] Ad Account Two',
      currency: Currency.USD,
      timezone: 'UTC',
      status: AdAccountStatus.ACTIVE,
      isActive: true,
    },
  });

  // Alpha: fully configured & advertising-ready
  await prisma.storeAdvertisingConfiguration.create({
    data: {
      organizationId: ORG_ID,
      shopifyStoreId: shopifyA.id,
      metaPlatformConnectionId: metaPrimary.id,
      metaBusinessId: 'qa-adv-meta-biz-alpha',
      adAccountId: adAccountPrimary.id,
      facebookPageId: 'qa-adv-page-alpha',
      instagramAccountId: 'qa-adv-ig-alpha',
      pixelId: 'qa-adv-pixel-alpha',
      catalogId: 'qa-adv-catalog-alpha',
    },
  });

  // Beta: intentionally NO advertising configuration

  await prisma.shopifyProduct.createMany({
    data: [
      {
        organizationId: ORG_ID,
        platformConnectionId: shopifyA.id,
        externalId: 'qa-adv-ext-a-01',
        title: '[QA ADV] Alpha Product 01',
        handle: 'qa-adv-alpha-01',
        vendor: 'QA Adv',
        productType: 'Test',
        description: 'Advertising config QA product',
        status: ShopifyProductStatus.ACTIVE,
        tags: ['qa-adv'],
        featuredImageUrl: null,
        lastSyncedAt: now,
      },
      {
        organizationId: ORG_ID,
        platformConnectionId: shopifyB.id,
        externalId: 'qa-adv-ext-b-01',
        title: '[QA ADV] Beta Product 01',
        handle: 'qa-adv-beta-01',
        vendor: 'QA Adv',
        productType: 'Test',
        description: 'Beta store product without ad config',
        status: ShopifyProductStatus.ACTIVE,
        tags: ['qa-adv'],
        featuredImageUrl: null,
        lastSyncedAt: now,
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        organizationId: ORG_ID,
        storeAlphaId: shopifyA.id,
        storeBetaId: shopifyB.id,
        metaPrimaryId: metaPrimary.id,
        metaSecondaryId: metaSecondary.id,
        adAccountPrimaryId: adAccountPrimary.id,
        adAccountSecondaryId: adAccountSecondary.id,
        note: 'Advertising Configuration QA seed ([QA ADV])',
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
