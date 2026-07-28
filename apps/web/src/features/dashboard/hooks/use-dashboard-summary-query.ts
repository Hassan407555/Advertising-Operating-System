"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { getDashboardSummary } from "@/features/dashboard/api/dashboard.api";

export function useDashboardSummaryQuery(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn: getDashboardSummary,
    staleTime: 15_000,
    enabled,
  });
}
