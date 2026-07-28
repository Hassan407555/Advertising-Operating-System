"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { getAiCopyCampaignOptions } from "@/features/ai-copy/api/campaign-options.api";
import { generateAiCopy } from "@/features/ai-copy/api/ai-copy.api";

export function useAiCopyCampaignOptionsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.CAMPAIGNS, "ai-copy-options"],
    queryFn: getAiCopyCampaignOptions,
  });
}

export function useGenerateAiCopyMutation() {
  return useMutation({
    mutationFn: generateAiCopy,
  });
}
