import type { PaginatedResponse } from "@/types/api";
import type { Campaign } from "@/types/campaign";
import type { AdAccount } from "@/types/ad-account";
import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";

export async function getSynchronizationCampaignOptions() {
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

export async function getSynchronizationAdAccountOptions() {
  const response = await apiClient.get("/ad-accounts", {
    params: {
      page: 1,
      limit: 100,
      isActive: true,
      sortBy: "updatedAt",
      sortOrder: "desc",
    },
  });
  const payload = unwrapEnvelope<PaginatedResponse<AdAccount>>(response.data);
  return payload.data;
}
