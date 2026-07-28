"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  listStoreProducts,
  startAdvertisingEntry,
} from "@/features/products/api/products.api";
import type {
  StartAdvertisingEntryPayload,
  StoreProductsListQuery,
} from "@/features/products/types/product.types";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";

export function useStoreProductsQuery(query: StoreProductsListQuery = {}) {
  const { activeStore } = useActiveStore();
  const storeId = activeStore?.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.STORE_PRODUCTS, storeId ?? "none", query],
    enabled: Boolean(storeId),
    queryFn: () => listStoreProducts(storeId!, query),
  });
}

export function useStartAdvertisingEntryMutation() {
  const queryClient = useQueryClient();
  const { activeStore } = useActiveStore();

  return useMutation({
    mutationFn: (payload: StartAdvertisingEntryPayload) => {
      if (!activeStore?.id) {
        throw new Error("Select an active store before advertising a product.");
      }
      return startAdvertisingEntry(activeStore.id, payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORE_PRODUCTS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_SESSIONS }),
      ]);
    },
  });
}
