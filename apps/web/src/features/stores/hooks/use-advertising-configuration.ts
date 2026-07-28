"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  getStore,
  getStoreAdvertisingConfiguration,
  upsertStoreAdvertisingConfiguration,
} from "@/features/stores/api/stores.api";
import type { UpsertStoreAdvertisingConfigurationPayload } from "@/features/stores/types/store.types";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";

export function useActiveStoreSummaryQuery() {
  const { activeStore } = useActiveStore();

  return useQuery({
    queryKey: [...QUERY_KEYS.STORES, "summary", activeStore?.id ?? "none"],
    enabled: Boolean(activeStore?.id),
    queryFn: () => getStore(activeStore!.id),
  });
}

export function useAdvertisingConfigurationQuery(storeId?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.STORES, "advertising-configuration", storeId ?? "none"],
    enabled: Boolean(storeId),
    queryFn: () => getStoreAdvertisingConfiguration(storeId!),
  });
}

export function useUpsertAdvertisingConfigurationMutation(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertStoreAdvertisingConfigurationPayload) =>
      upsertStoreAdvertisingConfiguration(storeId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORES });
    },
  });
}
