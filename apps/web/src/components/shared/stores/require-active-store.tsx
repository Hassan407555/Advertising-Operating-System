"use client";

import Link from "next/link";
import type { PropsWithChildren, ReactNode } from "react";
import { Store } from "lucide-react";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageLoading } from "@/components/shared/states/page-loading";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";

interface RequireActiveStoreProps extends PropsWithChildren {
  /** Optional custom empty state when no store is selected. */
  fallback?: ReactNode;
  /**
   * Module-owned empty copy when no stores exist.
   * Dashboard owns onboarding; feature pages should keep their own identity.
   */
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Gate for store-scoped features.
 * Prefer module-specific emptyTitle/emptyDescription over a duplicated Shopify onboarding page.
 */
export function RequireActiveStore({
  children,
  fallback,
  emptyTitle = "No store selected",
  emptyDescription = "Choose or connect a Shopify store from Commerce to use this module.",
}: RequireActiveStoreProps) {
  const { activeStore, isResolving, hasNoStores, needsStoreSelection } = useActiveStore();

  if (isResolving) {
    return <PageLoading cards={1} />;
  }

  if (hasNoStores) {
    return (
      fallback ?? (
        <PageEmpty
          title={emptyTitle}
          description={emptyDescription}
          icon={<Store className="size-5" aria-hidden />}
          action={
            <Link href={ROUTES.SHOPIFY_CONNECTIONS}>
              <Button variant="secondary">Open Shopify</Button>
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
          icon={<Store className="size-5" aria-hidden />}
        />
      )
    );
  }

  return <>{children}</>;
}
