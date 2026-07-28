"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { getAdAccountsForCampaigns } from "@/features/campaigns/api/ad-accounts.api";
import {
  createCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaigns,
  updateCampaign,
} from "@/features/campaigns/api/campaigns.api";
import type { CampaignListQuery, CreateCampaignPayload, UpdateCampaignPayload } from "@/types/campaign";

export function useCampaignsQuery(query: CampaignListQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CAMPAIGNS, query],
    queryFn: () => getCampaigns(query),
    placeholderData: (previous) => previous,
  });
}

export function useCampaignDetailsQuery(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CAMPAIGN_DETAILS, id],
    queryFn: () => getCampaignById(id),
    enabled: Boolean(id),
  });
}

export function useAdAccountsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.AD_ACCOUNTS,
    queryFn: getAdAccountsForCampaigns,
  });
}

export function useCreateCampaignMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCampaignPayload) => createCampaign(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
    },
  });
}

export function useUpdateCampaignMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCampaignPayload) => updateCampaign(id, payload),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS });
      queryClient.setQueryData([...QUERY_KEYS.CAMPAIGN_DETAILS, id], campaign);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
    },
  });
}

export function useDeleteCampaignMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS });
      queryClient.removeQueries({ queryKey: [...QUERY_KEYS.CAMPAIGN_DETAILS, id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
    },
  });
}
