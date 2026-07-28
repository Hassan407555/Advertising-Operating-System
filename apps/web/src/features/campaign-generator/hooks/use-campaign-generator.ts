"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateCampaign,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGN_DETAILS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_ACCOUNTS }),
      ]);
    },
  });
}
