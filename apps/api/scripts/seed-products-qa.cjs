/**
 * QA seed data for Products module testing.
 * Seeded records are tagged with [QA SEED] in names/titles/handles.
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
    throw new Error(`Organization ${ORG_ID} not found. Register first.`);
  }

  await prisma.shopifyProduct.deleteMany({
    where: {
      organizationId: ORG_ID,
      OR: [
        { title: { startsWith: '[QA SEED]' } },
        { handle: { startsWith: 'qa-seed-' } },
      ],
    },
  });
  await prisma.storeAdvertisingConfiguration.deleteMany({
    where: { organizationId: ORG_ID },
  });
  await prisma.adAccount.deleteMany({
    where: {
      organizationId: ORG_ID,
      accountName: { startsWith: '[QA SEED]' },
    },
  });
  await prisma.platformConnection.deleteMany({
    where: {
      organizationId: ORG_ID,
      accountName: { startsWith: '[QA SEED]' },
    },
  });

  const now = new Date();

  const shopifyA = await prisma.platformConnection.create({
    data: {
      organizationId: ORG_ID,
      createdByUserId: USER_ID,
      platform: PlatformType.SHOPIFY,
      accountId: 'qa-seed-store-a.myshopify.com',
      accountName: '[QA SEED] Store Alpha',
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
      accountId: 'qa-seed-store-b.myshopify.com',
      accountName: '[QA SEED] Store Beta',
      status: ConnectionStatus.ACTIVE,
      syncStatus: SyncStatus.SYNCED,
      lastSyncedAt: now,
      lastSuccessfulSyncAt: now,
    },
  });

  const meta = await prisma.platformConnection.create({
    data: {
      organizationId: ORG_ID,
      createdByUserId: USER_ID,
      platform: PlatformType.META,
      accountId: 'qa-seed-meta-biz-1',
      accountName: '[QA SEED] Meta Business',
      status: ConnectionStatus.ACTIVE,
      syncStatus: SyncStatus.SYNCED,
      lastSyncedAt: now,
      lastSuccessfulSyncAt: now,
    },
  });

  const adAccount = await prisma.adAccount.create({
    data: {
      organizationId: ORG_ID,
      platformConnectionId: meta.id,
      platform: PlatformType.META,
      externalId: 'qa-seed-ad-account-1',
      accountName: '[QA SEED] Ad Account',
      currency: Currency.USD,
      timezone: 'UTC',
      status: AdAccountStatus.ACTIVE,
      isActive: true,
    },
  });

  await prisma.storeAdvertisingConfiguration.create({
    data: {
      organizationId: ORG_ID,
      shopifyStoreId: shopifyA.id,
      metaPlatformConnectionId: meta.id,
      metaBusinessId: 'qa-seed-meta-biz-1',
      adAccountId: adAccount.id,
      facebookPageId: 'qa-seed-page-1',
      instagramAccountId: 'qa-seed-ig-1',
      pixelId: 'qa-seed-pixel-1',
      catalogId: 'qa-seed-catalog-1',
    },
  });

  const productsA = [];
  for (let i = 1; i <= 25; i++) {
    const padded = String(i).padStart(2, '0');
    const isDraft = i === 3 || i === 7;
    const noImage = i === 5;
    productsA.push({
      organizationId: ORG_ID,
      platformConnectionId: shopifyA.id,
      externalId: `qa-seed-ext-a-${padded}`,
      title: `[QA SEED] Alpha Product ${padded}`,
      handle: `qa-seed-alpha-product-${padded}`,
      vendor: i % 2 === 0 ? 'QA Vendor Even' : 'QA Vendor Odd',
      productType: i % 3 === 0 ? 'Apparel' : 'Accessories',
      description: `QA seeded description for Alpha Product ${padded}`,
      status: isDraft ? ShopifyProductStatus.DRAFT : ShopifyProductStatus.ACTIVE,
      tags: ['qa-seed', i % 2 === 0 ? 'even' : 'odd'],
      featuredImageUrl: noImage
        ? null
        : `https://picsum.photos/seed/qa-alpha-${padded}/200/200`,
      lastSyncedAt: now,
    });
  }

  productsA.push({
    organizationId: ORG_ID,
    platformConnectionId: shopifyA.id,
    externalId: 'qa-seed-ext-a-unique',
    title: '[QA SEED] Unique Searchable Widget',
    handle: 'qa-seed-unique-searchable-widget',
    vendor: 'Special Vendor Co',
    productType: 'Gadgets',
    description: 'Only this product matches unique-search-token-xyz',
    status: ShopifyProductStatus.ACTIVE,
    tags: ['qa-seed', 'search'],
    featuredImageUrl: 'https://picsum.photos/seed/qa-unique/200/200',
    lastSyncedAt: now,
  });

  await prisma.shopifyProduct.createMany({ data: productsA });

  const createdA = await prisma.shopifyProduct.findMany({
    where: { platformConnectionId: shopifyA.id },
    orderBy: { title: 'asc' },
  });

  for (const product of createdA.slice(0, 5)) {
    await prisma.shopifyVariant.createMany({
      data: [
        {
          productId: product.id,
          externalId: `${product.externalId}-v1`,
          title: 'Default',
          sku: `QA-SKU-${product.externalId}-1`,
          price: 29.99,
          inventoryQuantity: 10,
          isDefault: true,
        },
        {
          productId: product.id,
          externalId: `${product.externalId}-v2`,
          title: 'Large',
          sku: `QA-SKU-${product.externalId}-2`,
          price: 34.99,
          inventoryQuantity: 4,
          isDefault: false,
        },
      ],
    });
    if (product.featuredImageUrl) {
      await prisma.shopifyImage.create({
        data: {
          productId: product.id,
          externalId: `${product.externalId}-img1`,
          url: product.featuredImageUrl,
          alt: product.title,
          width: 200,
          height: 200,
          displayOrder: 0,
        },
      });
    }
  }

  await prisma.shopifyProduct.createMany({
    data: [
      {
        organizationId: ORG_ID,
        platformConnectionId: shopifyB.id,
        externalId: 'qa-seed-ext-b-01',
        title: '[QA SEED] Beta Only Product 01',
        handle: 'qa-seed-beta-only-01',
        vendor: 'Beta Vendor',
        productType: 'Beta Type',
        description: 'Should only appear for Store Beta',
        status: ShopifyProductStatus.ACTIVE,
        tags: ['qa-seed', 'beta'],
        featuredImageUrl: 'https://picsum.photos/seed/qa-beta-01/200/200',
        lastSyncedAt: now,
      },
      {
        organizationId: ORG_ID,
        platformConnectionId: shopifyB.id,
        externalId: 'qa-seed-ext-b-02',
        title: '[QA SEED] Beta Only Product 02',
        handle: 'qa-seed-beta-only-02',
        vendor: 'Beta Vendor',
        productType: 'Beta Type',
        description: 'Second beta product',
        status: ShopifyProductStatus.ACTIVE,
        tags: ['qa-seed', 'beta'],
        featuredImageUrl: null,
        lastSyncedAt: now,
      },
    ],
  });

  const countA = await prisma.shopifyProduct.count({
    where: { platformConnectionId: shopifyA.id, deletedAt: null },
  });
  const countB = await prisma.shopifyProduct.count({
    where: { platformConnectionId: shopifyB.id, deletedAt: null },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        organizationId: ORG_ID,
        storeAId: shopifyA.id,
        storeBId: shopifyB.id,
        metaId: meta.id,
        adAccountId: adAccount.id,
        productCountA: countA,
        productCountB: countB,
        note: 'Seeded [QA SEED] stores/products for Products module QA',
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
