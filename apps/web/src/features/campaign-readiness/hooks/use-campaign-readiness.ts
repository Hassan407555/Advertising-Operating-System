"use client";

import { useMemo } from "react";
import type { Campaign } from "@/types/campaign";
import type { Store } from "@/features/stores/types/store.types";
import type { PublishCampaignResponse } from "@/features/publisher/types/publisher.types";
import { deriveCampaignReadiness } from "@/features/campaign-readiness/lib/derive-campaign-readiness";

interface UseCampaignReadinessInput {
  store?: Store | null;
  campaign?: Campaign | null;
  publishResult?: PublishCampaignResponse | null;
  hasCampaignGenerated?: boolean;
  hasDraftSaved?: boolean;
}

export function useCampaignReadiness(input: UseCampaignReadinessInput) {
  const { store, campaign, publishResult, hasCampaignGenerated, hasDraftSaved } = input;

  return useMemo(() => {
    const isLive =
      Boolean(publishResult?.success && publishResult.status === "PUBLISHED") ||
      Boolean(publishResult?.externalCampaignId) ||
      campaign?.status === "ACTIVE";

    const campaignExists = Boolean(campaign?.id);

    return deriveCampaignReadiness({
      capabilities: store?.capabilities,
      campaignId: campaign?.id,
      hasCampaignGenerated: hasCampaignGenerated ?? campaignExists,
      hasDraftSaved: hasDraftSaved ?? campaignExists,
      isLive,
    });
  }, [
    campaign?.id,
    campaign?.status,
    hasCampaignGenerated,
    hasDraftSaved,
    publishResult,
    store?.capabilities,
  ]);
}
