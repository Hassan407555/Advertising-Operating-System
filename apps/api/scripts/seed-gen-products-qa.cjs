/**
 * Seed 5 rich products on [QA ADV] Store Alpha for AI Campaign Generation quality QA.
 * Soft-archives prior [QA GEN] products; does not wipe advertising config.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PRODUCTS = [
  {
    externalId: 'qa-gen-ext-01',
    title: '[QA GEN] HydraGlow Serum',
    handle: 'qa-gen-hydraglow-serum',
    vendor: 'Luma Labs',
    productType: 'Skincare',
    description:
      'A lightweight hyaluronic acid serum that locks in moisture for 24 hours. Fragrance-free formula with niacinamide for brighter, plumper skin.',
    tags: ['skincare', 'hydrating', 'serum', 'qa-gen'],
    featuredImageUrl: 'https://picsum.photos/seed/hydraglow/800/800',
    price: '38.00',
  },
  {
    externalId: 'qa-gen-ext-02',
    title: '[QA GEN] TrailRunner Pro Shoes',
    handle: 'qa-gen-trailrunner-pro',
    vendor: 'PeakPath Athletics',
    productType: 'Footwear',
    description:
      'Waterproof trail shoes with carbon plate propulsion and cushioned rocker sole. Built for rocky paths and rainy morning runs.',
    tags: ['footwear', 'running', 'outdoor', 'qa-gen'],
    featuredImageUrl: 'https://picsum.photos/seed/trailrunner/800/800',
    price: '149.00',
  },
  {
    externalId: 'qa-gen-ext-03',
    title: '[QA GEN] EmberCast Pour-Over Kit',
    handle: 'qa-gen-embercast-kit',
    vendor: 'EmberCast Coffee',
    productType: 'Kitchen',
    description:
      'Ceramic pour-over dripper, gooseneck kettle insert, and dual filters. Brew café-grade coffee at home in under four minutes.',
    tags: ['coffee', 'kitchen', 'home', 'qa-gen'],
    featuredImageUrl: 'https://picsum.photos/seed/embercast/800/800',
    price: '79.00',
  },
  {
    externalId: 'qa-gen-ext-04',
    title: '[QA GEN] NovaDesk Standing Desk',
    handle: 'qa-gen-novadesk',
    vendor: 'NovaDesk Co',
    productType: 'Furniture',
    description:
      'Electric standing desk with memory presets, cable tray, and anti-collision sensors. Quiet motors and solid oak top.',
    tags: ['furniture', 'office', 'ergonomic', 'qa-gen'],
    featuredImageUrl: 'https://picsum.photos/seed/novadesk/800/800',
    price: '499.00',
  },
  {
    externalId: 'qa-gen-ext-05',
    title: '[QA GEN] Aurora SoftShell Jacket',
    handle: 'qa-gen-aurora-jacket',
    vendor: 'Aurora Outdoor',
    productType: 'Apparel',
    description:
      'Windproof softshell jacket with packable hood and reflective seams. Breathable for cool evening runs and windy trail days.',
    tags: ['apparel', 'outdoor', 'jacket', 'qa-gen'],
    featuredImageUrl: 'https://picsum.photos/seed/aurora/800/800',
    price: '128.00',
  },
];

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const shopifyA = await prisma.platformConnection.findFirst({
      where: {
        organizationId: 'cms5nhfz90000i008bhjg7ac4',
        platform: 'SHOPIFY',
        accountName: '[QA ADV] Store Alpha',
        deletedAt: null,
      },
    });
    if (!shopifyA) {
      throw new Error('Run seed-advertising-config-qa.cjs first — Alpha store missing.');
    }

    const existing = await prisma.shopifyProduct.findMany({
      where: {
        organizationId: 'cms5nhfz90000i008bhjg7ac4',
        OR: [
          { title: { startsWith: '[QA GEN]' } },
          { handle: { startsWith: 'qa-gen-' } },
        ],
      },
      select: { id: true },
    });
    const ids = existing.map((e) => e.id);
    if (ids.length) {
      await prisma.shopifyProduct.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: new Date(), status: 'ARCHIVED' },
      });
    }

    const now = new Date();
    for (const p of PRODUCTS) {
      const created = await prisma.shopifyProduct.create({
        data: {
          organizationId: 'cms5nhfz90000i008bhjg7ac4',
          platformConnectionId: shopifyA.id,
          externalId: p.externalId,
          title: p.title,
          handle: p.handle,
          vendor: p.vendor,
          productType: p.productType,
          description: p.description,
          status: 'ACTIVE',
          tags: p.tags,
          featuredImageUrl: p.featuredImageUrl,
          lastSyncedAt: now,
        },
      });

      await prisma.shopifyProductImage.create({
        data: {
          shopifyProductId: created.id,
          externalId: `${p.externalId}-img-1`,
          url: p.featuredImageUrl,
          alt: p.title,
          displayOrder: 0,
        },
      });

      await prisma.shopifyProductVariant.create({
        data: {
          shopifyProductId: created.id,
          externalId: `${p.externalId}-var-1`,
          title: 'Default',
          sku: `${p.handle}-SKU`,
          price: p.price,
          currency: 'USD',
          inventoryQuantity: 120,
        },
      });
    }

    console.log(
      JSON.stringify(
        { ok: true, storeId: shopifyA.id, seeded: PRODUCTS.map((p) => p.title) },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

const PRODUCTS = [
  {
    externalId: 'qa-gen-ext-01',
    title: '[QA GEN] HydraGlow Serum',
    handle: 'qa-gen-hydraglow-serum',
    vendor: 'Luma Labs',
    productType: 'Skincare',
    description:
      'A lightweight hyaluronic acid serum that locks in moisture for 24 hours. Fragrance-free formula with niacinamide for brighter, plumper skin.',
    tags: ['skincare', 'hydrating', 'serum', 'qa-gen'],
    featuredImageUrl: 'https://picsum.photos/seed/hydraglow/800/800',
    price: '38.00',
  },
  {
    externalId: 'qa-gen-ext-02',
    title: '[QA GEN] TrailRunner Pro Shoes',
    handle: 'qa-gen-trailrunner-pro',
    vendor: 'PeakPath Athletics',
    productType: 'Footwear',
    description:
      'Waterproof trail shoes with carbon plate propulsion and cushioned rocker sole. Built for rocky paths and rainy morning runs.',
    tags: ['footwear', 'running', 'outdoor', 'qa-gen'],
    featuredImageUrl: 'https://picsum.photos/seed/trailrunner/800/800',
    price: '149.00',
  },
  {
    externalId: 'qa-gen-ext-03',
    title: '[QA GEN] EmberCast Pour-Over Kit',
    handle: 'qa-gen-embercast-kit',
    vendor: 'EmberCast Coffee',
    productType: 'Kitchen',
    description:
      'Ceramic pour-over dripper, gooseneck kettle insert, and dual filters. Brew café-grade coffee at home in under four minutes.',
    tags: ['coffee', 'kitchen', 'home', 'qa-gen'],
    featuredImageUrl: 'https://picsum.photos/seed/embercast/800/800',
    price: '79.00',
  },
  {
    externalId: 'qa-gen-ext-04',
    title: '[QA GEN] NovaDesk Standing Desk',
    handle: 'qa-gen-novadesk',
    vendor: 'NovaDesk Co',
    productType: 'Furniture',
    description:
      'Electric standing desk with memory presets, cable tray, and anti-collision sensors. Quiet motors and solid oak top.',
    tags: ['furniture', 'office', 'ergonomic', 'qa-gen'],
    featuredImageUrl: 'https://picsum.photos/seed/novadesk/800/800',
    price: '499.00',
  },
  {
    externalId: 'qa-gen-ext-05',
    title: '[QA GEN] Aurora SoftShell Jacket',
    handle: 'qa-gen-aurora-jacket',
    vendor: 'Aurora Outdoor',
    productType: 'Apparel',
    description:
      'Windproof softshell jacket with packable hood and reflective seams. Breathable for cool evening runs and windy trail days.',
    tags: ['apparel', 'outdoor', 'jacket', 'qa-gen'],
    featuredImageUrl: 'https://picsum.photos/seed/aurora/800/800',
    price: '128.00',
  },
];
