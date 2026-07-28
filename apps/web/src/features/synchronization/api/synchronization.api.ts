import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type { CampaignSyncStatusResponse, SyncResultResponse } from "@/features/synchronization/types/synchronization.types";

export async function syncCampaign(campaignId: string) {
  const response = await apiClient.post(`/synchronization/campaign/${campaignId}`);
  return unwrapEnvelope<SyncResultResponse>(response.data);
}

export async function syncAccount(adAccountId: string) {
  const response = await apiClient.post(`/synchronization/account/${adAccountId}`);
  return unwrapEnvelope<SyncResultResponse>(response.data);
}

export async function getCampaignSyncStatus(campaignId: string) {
  const response = await apiClient.get(`/synchronization/status/${campaignId}`);
  return unwrapEnvelope<CampaignSyncStatusResponse>(response.data);
}
