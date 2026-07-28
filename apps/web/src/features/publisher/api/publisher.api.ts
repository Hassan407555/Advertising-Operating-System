import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type {
  PublishCampaignPayload,
  PublishCampaignResponse,
  PublisherPlatformsResponse,
  PublishValidationResponse,
} from "@/features/publisher/types/publisher.types";

export async function getPublisherPlatforms() {
  const response = await apiClient.get("/publisher/platforms");
  return unwrapEnvelope<PublisherPlatformsResponse>(response.data);
}

export async function validatePublish(payload: PublishCampaignPayload) {
  const response = await apiClient.post("/publisher/validate", payload);
  return unwrapEnvelope<PublishValidationResponse>(response.data);
}

export async function publishCampaign(payload: PublishCampaignPayload) {
  const response = await apiClient.post("/publisher/publish", payload);
  return unwrapEnvelope<PublishCampaignResponse>(response.data);
}
