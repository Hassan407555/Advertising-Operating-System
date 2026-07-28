import type { PaginatedResponse } from "@/types/api";
import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type { Campaign, CampaignListQuery, CreateCampaignPayload, UpdateCampaignPayload } from "@/types/campaign";

export async function getCampaigns(query: CampaignListQuery) {
  const response = await apiClient.get("/campaigns", { params: query });
  return unwrapEnvelope<PaginatedResponse<Campaign>>(response.data);
}

export async function getCampaignById(id: string) {
  const response = await apiClient.get(`/campaigns/${id}`);
  return unwrapEnvelope<Campaign>(response.data);
}

export async function createCampaign(payload: CreateCampaignPayload) {
  const response = await apiClient.post("/campaigns", payload);
  return unwrapEnvelope<Campaign>(response.data);
}

export async function updateCampaign(id: string, payload: UpdateCampaignPayload) {
  const response = await apiClient.patch(`/campaigns/${id}`, payload);
  return unwrapEnvelope<Campaign>(response.data);
}

export async function deleteCampaign(id: string) {
  await apiClient.delete(`/campaigns/${id}`);
}
