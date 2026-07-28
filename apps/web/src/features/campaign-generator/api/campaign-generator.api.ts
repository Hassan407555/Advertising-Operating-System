import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type { GenerateCampaignPayload, GenerateCampaignResponse } from "@/features/campaign-generator/types/campaign-generator.types";

export async function generateCampaign(payload: GenerateCampaignPayload) {
  const response = await apiClient.post("/campaign-generator/generate", payload);
  return unwrapEnvelope<GenerateCampaignResponse>(response.data);
}
