import { Prisma } from '@prisma/client';

export const REPORT_INCLUDE = Prisma.validator<Prisma.ReportInclude>()({
  organization: {
    select: {
      id: true,
      name: true,
    },
  },

  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },

  schedules: true,
});

export type ReportWithRelations = Prisma.ReportGetPayload<{
  include: typeof REPORT_INCLUDE;
}>;

export const REPORT_SORT_FIELDS = [
  'name',
  'level',
  'platform',
  'createdAt',
  'updatedAt',
] as const;

export type ReportSortField =
  (typeof REPORT_SORT_FIELDS)[number];

export const DEFAULT_SORT_BY: ReportSortField =
  'createdAt';