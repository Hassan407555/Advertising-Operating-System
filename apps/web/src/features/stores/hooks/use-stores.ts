"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { listStores } from "@/features/stores/api/stores.api";
import { AppError } from "@/lib/api/errors";
import { useSession } from "@/providers/session-provider";

export function useStoresQuery(enabled = true) {
  const { organization, isAuthenticated } = useSession();

  return useQuery({
    queryKey: [...QUERY_KEYS.STORES, organization?.id ?? "none"],
    enabled: enabled && isAuthenticated && Boolean(organization?.id),
    queryFn: async () => {
      try {
        return await listStores();
      } catch (error) {
        if (error instanceof AppError && (error.statusCode === 403 || error.statusCode === 404)) {
          return [];
        }
        throw error;
      }
    },
  });
}
