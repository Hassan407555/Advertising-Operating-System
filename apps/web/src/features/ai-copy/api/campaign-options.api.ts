import type { PaginatedResponse } from "@/types/api";
import type { Campaign } from "@/types/campaign";
import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";

export async function getAiCopyCampaignOptions() {
  const response = await apiClient.get("/campaigns", {
    params: {
      page: 1,
      limit: 100,
      sortBy: "updatedAt",
      sortOrder: "desc",
    },
  });

  const payload = unwrapEnvelope<PaginatedResponse<Campaign>>(response.data);
  return payload.data;
}
