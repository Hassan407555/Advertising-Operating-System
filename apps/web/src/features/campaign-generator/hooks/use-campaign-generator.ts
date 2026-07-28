"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { generateCampaign } from "@/features/campaign-generator/api/campaign-generator.api";
import { getGeneratorAdAccounts } from "@/features/campaign-generator/api/ad-accounts.api";

export function useGeneratorAdAccountsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.AD_ACCOUNTS, "campaign-generator"],
    queryFn: getGeneratorAdAccounts,
  });
}

export function useGenerateCampaignMutation() {
  return useMutation({
    mutationFn: generateCampaign,
  });
}
