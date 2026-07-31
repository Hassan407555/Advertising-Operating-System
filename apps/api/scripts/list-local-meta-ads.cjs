const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const connection = await prisma.platformConnection.findFirst({
      where: {
        organizationId: 'cms72gsxe0002i0y82wzmykjc',
        platform: 'META',
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true, accountName: true, accountId: true },
    });

    const ads = await prisma.adAccount.findMany({
      where: {
        organizationId: 'cms72gsxe0002i0y82wzmykjc',
        platform: 'META',
        deletedAt: null,
      },
      select: {
        id: true,
        externalId: true,
        accountName: true,
        isActive: true,
        platformConnectionId: true,
        currency: true,
      },
    });

    console.log(JSON.stringify({ connection, localAdAccounts: ads }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
