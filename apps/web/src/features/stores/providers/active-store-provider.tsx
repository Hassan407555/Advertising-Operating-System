"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { useStoresQuery } from "@/features/stores/hooks/use-stores";
import {
  clearAllCachedActiveStoreIds,
  clearCachedActiveStoreId,
  readCachedActiveStoreId,
  writeCachedActiveStoreId,
} from "@/features/stores/lib/active-store-cache";
import type { Store } from "@/features/stores/types/store.types";
import { useSession } from "@/providers/session-provider";

interface ActiveStoreContextValue {
  /** Validated active store for the current organization, or null. */
  activeStore: Store | null;
  /** All Shopify stores available for the current organization. */
  stores: Store[];
  /** True while stores are loading or active store is being resolved. */
  isResolving: boolean;
  /** True when the org has no connected stores. */
  hasNoStores: boolean;
  /** True when multiple stores exist and none is selected yet. */
  needsStoreSelection: boolean;
  /** Select an active store (must belong to the current org store list). */
  setActiveStore: (storeId: string) => void;
  /** Clear the active store for the current organization. */
  clearActiveStore: () => void;
  /** Re-fetch stores and re-validate the active selection. */
  refreshStores: () => Promise<void>;
}

const ActiveStoreContext = createContext<ActiveStoreContextValue | null>(null);

function resolveActiveStore(stores: Store[], organizationId: string): Store | null {
  if (stores.length === 0) {
    clearCachedActiveStoreId(organizationId);
    return null;
  }

  const cachedId = readCachedActiveStoreId(organizationId);
  if (cachedId) {
    const cachedStore = stores.find((store) => store.id === cachedId);
    if (cachedStore) {
      return cachedStore;
    }
    clearCachedActiveStoreId(organizationId);
  }

  if (stores.length === 1) {
    const onlyStore = stores[0];
    writeCachedActiveStoreId(organizationId, onlyStore.id);
    return onlyStore;
  }

  return null;
}

export function ActiveStoreProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { organization, isAuthenticated, isBootstrapping } = useSession();
  const organizationId = organization?.id ?? null;
  const storesQuery = useStoresQuery(isAuthenticated && !isBootstrapping && Boolean(organizationId));
  const [activeStore, setActiveStoreState] = useState<Store | null>(null);

  useEffect(() => {
    // During bootstrap tokens are not loaded yet — do not treat that as logout
    // or the active-store cache is wiped on every full page refresh.
    if (isBootstrapping) {
      return;
    }
    if (!isAuthenticated) {
      clearAllCachedActiveStoreIds();
      setActiveStoreState(null);
    }
  }, [isAuthenticated, isBootstrapping]);

  useEffect(() => {
    setActiveStoreState(null);
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    // Wait for the first successful fetch for this org; allow background refetch to re-validate.
    if (storesQuery.isPending) {
      return;
    }

    if (storesQuery.isError) {
      setActiveStoreState(null);
      return;
    }

    const stores = storesQuery.data ?? [];
    setActiveStoreState(resolveActiveStore(stores, organizationId));
  }, [organizationId, storesQuery.data, storesQuery.isError, storesQuery.isPending]);

  const invalidateStoreScopedQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SHOPIFY }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CAMPAIGNS }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ANALYTICS }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORES }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORE_PRODUCTS }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_SESSIONS }),
    ]);
  }, [queryClient]);

  const setActiveStore = useCallback(
    (storeId: string) => {
      if (!organizationId) {
        return;
      }

      const stores = storesQuery.data ?? [];
      const next = stores.find((store) => store.id === storeId) ?? null;
      if (!next) {
        return;
      }

      writeCachedActiveStoreId(organizationId, next.id);
      setActiveStoreState(next);
      void invalidateStoreScopedQueries();
    },
    [invalidateStoreScopedQueries, organizationId, storesQuery.data],
  );

  const clearActiveStore = useCallback(() => {
    if (organizationId) {
      clearCachedActiveStoreId(organizationId);
    }
    setActiveStoreState(null);
  }, [organizationId]);

  const refreshStores = useCallback(async () => {
    await storesQuery.refetch();
  }, [storesQuery]);

  const stores = storesQuery.data ?? [];
  const isResolving =
    isBootstrapping ||
    (isAuthenticated && Boolean(organizationId) && storesQuery.isPending);  const hasNoStores = !isResolving && stores.length === 0;
  const needsStoreSelection = !isResolving && stores.length > 1 && activeStore === null;

  const value = useMemo<ActiveStoreContextValue>(
    () => ({
      activeStore,
      stores,
      isResolving,
      hasNoStores,
      needsStoreSelection,
      setActiveStore,
      clearActiveStore,
      refreshStores,
    }),
    [
      activeStore,
      stores,
      isResolving,
      hasNoStores,
      needsStoreSelection,
      setActiveStore,
      clearActiveStore,
      refreshStores,
    ],
  );

  return <ActiveStoreContext.Provider value={value}>{children}</ActiveStoreContext.Provider>;
}

/**
 * Single source of truth for the active store.
 * Future modules must use this hook — never read localStorage or platform connections directly.
 */
export function useActiveStore() {
  const context = useContext(ActiveStoreContext);

  if (!context) {
    throw new Error("useActiveStore must be used within ActiveStoreProvider");
  }

  return context;
}
