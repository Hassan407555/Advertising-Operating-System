"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  getSynchronizationAdAccountOptions,
  getSynchronizationCampaignOptions,
} from "@/features/synchronization/api/synchronization-options.api";
import { getCampaignSyncStatus, syncAccount, syncCampaign } from "@/features/synchronization/api/synchronization.api";

export function useSynchronizationCampaignOptionsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.SYNCHRONIZATION, "campaign-options"],
    queryFn: getSynchronizationCampaignOptions,
  });
}

export function useSynchronizationAdAccountOptionsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.SYNCHRONIZATION, "ad-account-options"],
    queryFn: getSynchronizationAdAccountOptions,
  });
}

export function useCampaignSyncStatusQuery(campaignId?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SYNCHRONIZATION, "status", campaignId],
    queryFn: () => getCampaignSyncStatus(campaignId as string),
    enabled: Boolean(campaignId),
  });
}

export function useSyncCampaignMutation() {
  return useMutation({
    mutationFn: syncCampaign,
  });
}

export function useSyncAccountMutation() {
  return useMutation({
    mutationFn: syncAccount,
  });
}
