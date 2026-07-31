"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  getStoreProduct,
  listStoreProducts,
  startAdvertisingEntry,
} from "@/features/products/api/products.api";
import { generateCampaignFromProduct } from "@/features/products/lib/generate-campaign-from-product";
import type {
  GenerateCampaignProgressStep,
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

export function useStoreProductQuery(productId?: string) {
  const { activeStore } = useActiveStore();
  const storeId = activeStore?.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.STORE_PRODUCTS, "detail", storeId ?? "none", productId ?? "none"],
    enabled: Boolean(storeId && productId),
    queryFn: () => getStoreProduct(storeId!, productId!),
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
    onSuccess: () => {
      // Do not await — blocking invalidation races with post-entry navigation.
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORE_PRODUCTS });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_SESSIONS });
    },
  });
}

export function useGenerateCampaignFromProductMutation() {
  const queryClient = useQueryClient();
  const { activeStore } = useActiveStore();

  return useMutation({
    mutationFn: async ({
      productId,
      canSaveDraft,
      onStep,
    }: {
      productId: string;
      canSaveDraft?: boolean;
      onStep?: (step: GenerateCampaignProgressStep) => void;
    }) => {
      if (!activeStore?.id) {
        throw new Error("Select an active store before generating a campaign.");
      }
      return generateCampaignFromProduct({
        storeId: activeStore.id,
        productId,
        canSaveDraft,
        onStep,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORE_PRODUCTS });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_SESSIONS });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS });
    },
  });
}
