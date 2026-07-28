"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { AppError } from "@/lib/api/errors";
import { getShopifyProductSyncStatus, runShopifyProductSync } from "@/features/shopify/products/api/shopify-products.api";

export function useShopifyProductSyncStatusQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.SHOPIFY, "products-sync-status"],
    queryFn: async () => {
      try {
        return await getShopifyProductSyncStatus();
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 404) {
          return null;
        }
        throw error;
      }
    },
  });
}

export function useRunShopifyProductSyncMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runShopifyProductSync,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SHOPIFY });
    },
  });
}
