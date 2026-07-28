"use client";

import Link from "next/link";
import type { PropsWithChildren, ReactNode } from "react";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageLoading } from "@/components/shared/states/page-loading";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";

interface RequireActiveStoreProps extends PropsWithChildren {
  /** Optional custom empty state when no store is selected. */
  fallback?: ReactNode;
}

/**
 * Gate for store-scoped features (products, campaigns, analytics, AI, Meta, approvals).
 * Future modules must wrap store-scoped pages with this (or equivalent).
 */
export function RequireActiveStore({ children, fallback }: RequireActiveStoreProps) {
  const { activeStore, isResolving, hasNoStores, needsStoreSelection } = useActiveStore();

  if (isResolving) {
    return <PageLoading cards={1} />;
  }

  if (hasNoStores) {
    return (
      fallback ?? (
        <PageEmpty
          title="No stores connected"
          description="This feature requires an active Shopify store. Connect a store to continue."
          action={
            <Link href={ROUTES.SHOPIFY_CONNECTIONS}>
              <Button>Connect Shopify Store</Button>
            </Link>
          }
        />
      )
    );
  }

  if (needsStoreSelection || !activeStore) {
    return (
      fallback ?? (
        <PageEmpty
          title="Select a store"
          description="Choose an active store from the top bar to continue."
        />
      )
    );
  }

  return <>{children}</>;
}
