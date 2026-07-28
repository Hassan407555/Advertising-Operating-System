import type { PaginatedResponse } from "@/types/api";
import type { AdAccount } from "@/types/ad-account";
import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";

export async function getAdAccountsForCampaigns() {
  const response = await apiClient.get("/ad-accounts", {
    params: {
      page: 1,
      limit: 100,
      isActive: true,
    },
  });

  const payload = unwrapEnvelope<PaginatedResponse<AdAccount>>(response.data);
  return payload.data;
}
