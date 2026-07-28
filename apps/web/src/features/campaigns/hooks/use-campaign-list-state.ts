"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CampaignListQuery } from "@/types/campaign";

const DEFAULT_LIMIT = 20;

export function useCampaignListState() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const query = useMemo<CampaignListQuery>(() => {
    return {
      page: Number(params.get("page") ?? 1),
      limit: Number(params.get("limit") ?? DEFAULT_LIMIT),
      search: params.get("search") ?? undefined,
      status: (params.get("status") as CampaignListQuery["status"]) ?? undefined,
      objective: (params.get("objective") as CampaignListQuery["objective"]) ?? undefined,
      platform: (params.get("platform") as CampaignListQuery["platform"]) ?? undefined,
      sortBy: (params.get("sortBy") as CampaignListQuery["sortBy"]) ?? "createdAt",
      sortOrder: (params.get("sortOrder") as CampaignListQuery["sortOrder"]) ?? "desc",
    };
  }, [params]);

  const patchQuery = (updates: Partial<CampaignListQuery>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    if (updates.page === undefined) {
      next.set("page", "1");
    }

    router.replace(`${pathname}?${next.toString()}`);
  };

  return { query, patchQuery };
}
