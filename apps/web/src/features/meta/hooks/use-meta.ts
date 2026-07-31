"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import {
  connectMeta,
  disconnectMeta,
  getMetaConnection,
  listMetaAdAccounts,
  listMetaBusinesses,
  listMetaCatalogs,
  listMetaInstagramAccounts,
  listMetaPages,
  listMetaPixels,
} from "@/features/meta/api/meta.api";
import type { ConnectMetaPayload } from "@/features/meta/types/meta.types";

export function useMetaConnectionQuery(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.META_CONNECTION,
    queryFn: getMetaConnection,
    enabled,
    retry: false,
  });
}

export function useMetaBusinessesQuery(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.META_BUSINESSES,
    queryFn: listMetaBusinesses,
    enabled,
  });
}

export function useMetaAdAccountsQuery(businessId?: string, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.META_AD_ACCOUNTS, businessId ?? "all"] as const,
    queryFn: () => listMetaAdAccounts(businessId),
    enabled,
  });
}

export function useMetaPagesQuery(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.META_PAGES,
    queryFn: listMetaPages,
    enabled,
  });
}

export function useMetaInstagramAccountsQuery(pageId?: string, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.META_INSTAGRAM_ACCOUNTS, pageId ?? "all"] as const,
    queryFn: () => listMetaInstagramAccounts(pageId),
    enabled,
  });
}

export function useMetaPixelsQuery(
  options?: { businessId?: string; adAccountId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.META_PIXELS,
      options?.businessId ?? "all",
      options?.adAccountId ?? "all",
    ] as const,
    queryFn: () => listMetaPixels(options),
    enabled,
  });
}

export function useMetaCatalogsQuery(businessId?: string, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.META_CATALOGS, businessId ?? "all"] as const,
    queryFn: () => listMetaCatalogs(businessId),
    enabled,
  });
}

export function useConnectMetaMutation() {
  return useMutation({
    mutationFn: (payload: ConnectMetaPayload = {}) => connectMeta(payload),
  });
}

export function useDisconnectMetaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectMeta,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.META_CONNECTION }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.META_BUSINESSES }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.META_AD_ACCOUNTS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.META_PAGES }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.META_INSTAGRAM_ACCOUNTS,
        }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.META_PIXELS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.META_CATALOGS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_ACCOUNTS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORES }),
      ]);
    },
  });
}
