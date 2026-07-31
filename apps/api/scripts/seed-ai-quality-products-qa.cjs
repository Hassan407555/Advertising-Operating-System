/**
 * Dedicated QA seed for AI campaign quality testing.
 * Soft-archives prior [QA GEN] / [AI-QA] products on Store Alpha.
 * Does not wipe advertising configuration.
 *
 * Prerequisite: seed-advertising-config-qa.cjs (Alpha store advertising-ready).
 * Usage: node scripts/seed-ai-quality-products-qa.cjs
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ORG_ID = 'cms5nhfz90000i008bhjg7ac4';
const ALPHA_STORE_NAME = '[QA ADV] Store Alpha';

const PRODUCTS = [
  {
    externalId: 'ai-qa-ext-01',
    title: '[AI-QA] HydraGlow Serum',
    handle: 'ai-qa-hydraglow-serum',
    vendor: 'Luma Labs',
    productType: 'Skincare',
    description:
      'A lightweight hyaluronic acid serum that locks in moisture for 24 hours. Fragrance-free formula with niacinamide for brighter, plumper skin. Use morning and night after cleansing.',
    tags: ['skincare', 'hydrating', 'serum', 'ai-qa'],
    featuredImageUrl: 'https://picsum.photos/seed/aiqahydraglow/800/800',
    price: '38.00',
  },
  {
    externalId: 'ai-qa-ext-02',
    title: '[AI-QA] TrailRunner Pro Shoes',
    handle: 'ai-qa-trailrunner-pro',
    vendor: 'PeakPath Athletics',
    productType: 'Footwear',
    description:
      'Waterproof trail shoes with carbon plate propulsion and a cushioned rocker sole. Built for rocky paths and rainy morning runs. Reflective heel tab for low-light visibility.',
    tags: ['footwear', 'running', 'outdoor', 'ai-qa'],
    featuredImageUrl: 'https://picsum.photos/seed/aiqatrailrunner/800/800',
    price: '149.00',
  },
  {
    externalId: 'ai-qa-ext-03',
    title: '[AI-QA] EmberCast Pour-Over Kit',
    handle: 'ai-qa-embercast-kit',
    vendor: 'EmberCast Coffee',
    productType: 'Kitchen',
    description:
      'Ceramic pour-over dripper, gooseneck-compatible design, and dual paper filters. Brew café-grade coffee at home in under four minutes. Dishwasher-safe dripper.',
    tags: ['coffee', 'kitchen', 'home', 'ai-qa'],
    featuredImageUrl: 'https://picsum.photos/seed/aiqaembercast/800/800',
    price: '79.00',
  },
  {
    externalId: 'ai-qa-ext-04',
    title: '[AI-QA] NovaDesk Standing Desk',
    handle: 'ai-qa-novadesk',
    vendor: 'NovaDesk Co',
    productType: 'Furniture',
    description:
      'Electric standing desk with three memory presets, under-desk cable tray, and anti-collision sensors. Quiet dual motors and a solid oak top. Height range 28–48 inches.',
    tags: ['furniture', 'office', 'ergonomic', 'ai-qa'],
    featuredImageUrl: 'https://picsum.photos/seed/aiqanovadesk/800/800',
    price: '499.00',
  },
  {
    externalId: 'ai-qa-ext-05',
    title: '[AI-QA] Aurora SoftShell Jacket',
    handle: 'ai-qa-aurora-jacket',
    vendor: 'Aurora Outdoor',
    productType: 'Apparel',
    description:
      'Windproof softshell jacket with a packable hood and reflective seams. Breathable for cool evening runs and windy trail days. Two zippered hand pockets and one chest pocket.',
    tags: ['apparel', 'outdoor', 'jacket', 'ai-qa'],
    featuredImageUrl: 'https://picsum.photos/seed/aiqaaurora/800/800',
    price: '128.00',
  },
];

async function main() {
  const shopifyA = await prisma.platformConnection.findFirst({
    where: {
      organizationId: ORG_ID,
      platform: 'SHOPIFY',
      accountName: ALPHA_STORE_NAME,
      deletedAt: null,
    },
  });

  if (!shopifyA) {
    throw new Error(
      'Alpha store missing. Run seed-advertising-config-qa.cjs first.',
    );
  }

  const existing = await prisma.shopifyProduct.findMany({
    where: {
      organizationId: ORG_ID,
      OR: [
        { title: { startsWith: '[QA GEN]' } },
        { title: { startsWith: '[AI-QA]' } },
        { handle: { startsWith: 'qa-gen-' } },
        { handle: { startsWith: 'ai-qa-' } },
        {
          externalId: {
            in: PRODUCTS.map((product) => product.externalId),
          },
        },
      ],
    },
    select: { id: true },
  });

  const ids = existing.map((row) => row.id);
  if (ids.length) {
    // Hard-delete so (platformConnectionId, externalId) can be reused.
    await prisma.shopifyImage.deleteMany({ where: { productId: { in: ids } } });
    await prisma.shopifyVariant.deleteMany({
      where: { productId: { in: ids } },
    });
    await prisma.shopifyProduct.deleteMany({ where: { id: { in: ids } } });
  }

  const now = new Date();
  const createdIds = [];

  for (const product of PRODUCTS) {
    const created = await prisma.shopifyProduct.create({
      data: {
        organizationId: ORG_ID,
        platformConnectionId: shopifyA.id,
        externalId: product.externalId,
        title: product.title,
        handle: product.handle,
        vendor: product.vendor,
        productType: product.productType,
        description: product.description,
        status: 'ACTIVE',
        tags: product.tags,
        featuredImageUrl: product.featuredImageUrl,
        lastSyncedAt: now,
      },
    });

    await prisma.shopifyImage.create({
      data: {
        productId: created.id,
        externalId: `${product.externalId}-img-1`,
        url: product.featuredImageUrl,
        alt: product.title,
        displayOrder: 0,
      },
    });

    await prisma.shopifyVariant.create({
      data: {
        productId: created.id,
        externalId: `${product.externalId}-var-1`,
        title: 'Default',
        sku: `${product.handle}-SKU`,
        price: product.price,
        inventoryQuantity: 120,
        isDefault: true,
      },
    });

    createdIds.push({ id: created.id, title: product.title });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        storeId: shopifyA.id,
        seededCount: createdIds.length,
        products: createdIds,
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
