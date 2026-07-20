import { Prisma } from '@prisma/client';

export function generateSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function generateUniqueOrganizationSlug(
  prisma: Prisma.TransactionClient,
  organizationName: string,
): Promise<string> {
  const baseSlug = generateSlug(organizationName);

  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await prisma.organization.findUnique({
      where: {
        slug,
      },
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}
