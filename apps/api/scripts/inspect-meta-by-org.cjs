const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const org = process.argv[2] || 'cms72gsxe0002i0y82wzmykjc';

  try {
    const rows = await prisma.platformConnection.findMany({
      where: {
        OR: [{ organizationId: org }, { platform: 'META' }],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        platform: true,
        accountId: true,
        accountName: true,
        status: true,
        deletedAt: true,
        organizationId: true,
        createdAt: true,
        credentials: {
          select: {
            id: true,
            isActive: true,
            revokedAt: true,
            expiresAt: true,
            accessToken: true,
            createdAt: true,
          },
        },
      },
    });

    const configs = await prisma.storeAdvertisingConfiguration.findMany({
      where: { organizationId: org },
      select: {
        id: true,
        shopifyStoreId: true,
        metaPlatformConnectionId: true,
      },
    });

    console.log(
      JSON.stringify(
        {
          org,
          connections: rows.map((row) => ({
            ...row,
            credentials: row.credentials.map((credential) => ({
              ...credential,
              accessToken: credential.accessToken
                ? `[encrypted len=${credential.accessToken.length}]`
                : null,
            })),
          })),
          configs,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
