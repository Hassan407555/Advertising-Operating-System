import { z } from "zod";
import {
  ANALYTICS_BREAKDOWN_DIMENSIONS,
  ANALYTICS_GROUP_BY_OPTIONS,
  ANALYTICS_LEVEL_OPTIONS,
  ANALYTICS_PLATFORM_OPTIONS,
  ANALYTICS_SORT_FIELDS,
} from "@/features/analytics/constants/analytics.constants";

export const analyticsFiltersSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    platform: z.enum(ANALYTICS_PLATFORM_OPTIONS).optional(),
    level: z.enum(ANALYTICS_LEVEL_OPTIONS).optional(),
    campaignId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    groupBy: z.enum(ANALYTICS_GROUP_BY_OPTIONS).default("day"),
    sortBy: z.enum(ANALYTICS_SORT_FIELDS).default("snapshotDate"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    dimension: z.enum(ANALYTICS_BREAKDOWN_DIMENSIONS).default("campaign"),
  })
  .refine((value) => !value.startDate || !value.endDate || new Date(value.startDate) <= new Date(value.endDate), {
    message: "End date must be after start date.",
    path: ["endDate"],
  });

export type AnalyticsFiltersFormValues = z.infer<typeof analyticsFiltersSchema>;
