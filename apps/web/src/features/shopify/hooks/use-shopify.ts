"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { connectShopify, disconnectShopifyStore, getShopifyStore } from "@/features/shopify/api/shopify.api";
import { AppError } from "@/lib/api/errors";

export function useShopifyConnectionQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.SHOPIFY, "connection"],
    queryFn: async () => {
      try {
        return await getShopifyStore();
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 404) {
          return null;
        }
        throw error;
      }
    },
  });
}

export function useConnectShopifyMutation() {
  return useMutation({
    mutationFn: connectShopify,
  });
}

export function useDisconnectShopifyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectShopifyStore,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SHOPIFY,
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.STORES,
      });
    },
  });
}
