const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const configs = await prisma.storeAdvertisingConfiguration.findMany({
      where: { organizationId: 'cms72gsxe0002i0y82wzmykjc' },
      select: {
        id: true,
        shopifyStoreId: true,
        metaPlatformConnectionId: true,
        metaBusinessId: true,
        adAccountId: true,
        facebookPageId: true,
        instagramAccountId: true,
        pixelId: true,
        catalogId: true,
      },
    });
    console.log(JSON.stringify(configs, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
