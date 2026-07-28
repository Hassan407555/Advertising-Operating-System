"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { getPublisherAdAccounts, getPublisherCampaignOptions } from "@/features/publisher/api/publisher-options.api";
import { getPublisherPlatforms, publishCampaign, validatePublish } from "@/features/publisher/api/publisher.api";
import { QUERY_KEYS } from "@/constants/query-keys";

export function usePublisherPlatformsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.PUBLISHER, "platforms"],
    queryFn: getPublisherPlatforms,
  });
}

export function usePublisherCampaignOptionsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.PUBLISHER, "campaign-options"],
    queryFn: getPublisherCampaignOptions,
  });
}

export function usePublisherAdAccountsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.PUBLISHER, "ad-account-options"],
    queryFn: getPublisherAdAccounts,
  });
}

export function useValidatePublishMutation() {
  return useMutation({
    mutationFn: validatePublish,
  });
}

export function usePublishCampaignMutation() {
  return useMutation({
    mutationFn: publishCampaign,
  });
}
