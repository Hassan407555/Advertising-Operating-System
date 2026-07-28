"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { analyticsFiltersSchema } from "@/features/analytics/schemas/analytics.schemas";
import type { AnalyticsFiltersFormValues } from "@/features/analytics/schemas/analytics.schemas";

const DEFAULTS = {
  page: 1,
  limit: 20,
  groupBy: "day",
  sortBy: "snapshotDate",
  sortOrder: "desc",
  dimension: "campaign",
} as const;

export function useAnalyticsFiltersState() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const filters = useMemo<AnalyticsFiltersFormValues>(() => {
    const parsed = analyticsFiltersSchema.safeParse({
      page: params.get("page") ?? DEFAULTS.page,
      limit: params.get("limit") ?? DEFAULTS.limit,
      search: params.get("search") ?? undefined,
      platform: params.get("platform") ?? undefined,
      level: params.get("level") ?? undefined,
      campaignId: params.get("campaignId") ?? undefined,
      startDate: params.get("startDate") ?? undefined,
      endDate: params.get("endDate") ?? undefined,
      groupBy: params.get("groupBy") ?? DEFAULTS.groupBy,
      sortBy: params.get("sortBy") ?? DEFAULTS.sortBy,
      sortOrder: params.get("sortOrder") ?? DEFAULTS.sortOrder,
      dimension: params.get("dimension") ?? DEFAULTS.dimension,
    });

    if (parsed.success) {
      return parsed.data;
    }

    return {
      page: DEFAULTS.page,
      limit: DEFAULTS.limit,
      groupBy: DEFAULTS.groupBy,
      sortBy: DEFAULTS.sortBy,
      sortOrder: DEFAULTS.sortOrder,
      dimension: DEFAULTS.dimension,
    };
  }, [params]);

  const patchFilters = (updates: Partial<AnalyticsFiltersFormValues>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value == null || value === "") {
        next.delete(key);
        return;
      }
      next.set(key, String(value));
    });
    router.replace(`${pathname}?${next.toString()}`);
  };

  return { filters, patchFilters };
}
