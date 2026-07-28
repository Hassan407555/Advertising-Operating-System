"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";

export function StoreSwitcher() {
  const {
    activeStore,
    stores,
    isResolving,
    hasNoStores,
    needsStoreSelection,
    setActiveStore,
  } = useActiveStore();

  if (isResolving) {
    return (
      <span className="hidden text-sm text-muted-foreground sm:inline" aria-live="polite">
        Loading stores…
      </span>
    );
  }

  if (hasNoStores) {
    return (
      <Link
        href={ROUTES.SHOPIFY}
        className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        Connect a store
      </Link>
    );
  }

  if (stores.length === 1 && activeStore) {
    return (
      <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground sm:inline" title={activeStore.name}>
        Store: {activeStore.name}
      </span>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Select store</span>
      <select
        className="max-w-[14rem] rounded-md border border-border bg-transparent px-2 py-1 text-sm"
        value={activeStore?.id ?? ""}
        onChange={(event) => {
          if (event.target.value) {
            setActiveStore(event.target.value);
          }
        }}
        aria-label="Select store"
      >
        {needsStoreSelection ? (
          <option value="" disabled>
            Select a store
          </option>
        ) : null}
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </label>
  );
}
