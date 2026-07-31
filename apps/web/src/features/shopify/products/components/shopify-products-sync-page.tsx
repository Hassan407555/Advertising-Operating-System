"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, RefreshCw, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/states/page-loading";
import { ROUTES } from "@/constants/routes";
import { usePermission } from "@/hooks/use-permission";
import {
  clearJourneyReturnTo,
  resolveJourneyReturnTo,
} from "@/lib/navigation/journey-return";
import { getErrorMessage } from "@/utils/errors";
import {
  useRunShopifyProductSyncMutation,
  useShopifyProductSyncStatusQuery,
} from "@/features/shopify/products/hooks/use-shopify-products-sync";
import { ShopifyProductSyncStatusCard } from "@/features/shopify/products/components/shopify-product-sync-status-card";
import { ShopifyProductSyncSummary } from "@/features/shopify/products/components/shopify-product-sync-summary";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";

export function ShopifyProductsSyncPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canView = usePermission("view");
  const canSync = usePermission("sync");
  const { refreshStores } = useActiveStore();
  const [returnTo, setReturnTo] = useState<string | null>(null);

  const statusQuery = useShopifyProductSyncStatusQuery();
  const syncMutation = useRunShopifyProductSyncMutation();

  useEffect(() => {
    const queryReturn = searchParams.get("returnTo");
    if (queryReturn) {
      setReturnTo(resolveJourneyReturnTo(queryReturn));
      return;
    }
    setReturnTo(resolveJourneyReturnTo(null));
  }, [searchParams]);

  const runSync = async () => {
    if (!canSync) {
      toast.error("Your role cannot sync products.");
      return;
    }

    try {
      const result = await syncMutation.mutateAsync();
      await refreshStores();
      toast.success("Products synced.");
      const destination = returnTo ?? resolveJourneyReturnTo(searchParams.get("returnTo"));
      if (destination) {
        clearJourneyReturnTo();
        void router.push(destination);
      } else {
        void router.push(ROUTES.PRODUCTS);
      }
      return result;
    } catch (error) {
      toast.error(getErrorMessage(error, "Product sync failed."));
      return null;
    }
  };

  if (!canView) {
    return (
      <PageEmpty title="Access restricted" description="Your role does not have Shopify access." />
    );
  }

  if (statusQuery.isLoading) {
    return <PageLoading cards={2} />;
  }

  if (statusQuery.isError) {
    return (
      <PageError
        title="Unable to load sync status"
        message={getErrorMessage(statusQuery.error, "Product sync status could not be loaded.")}
        onRetry={() => statusQuery.refetch()}
      />
    );
  }

  if (!statusQuery.data) {
    return (
      <PageEmpty
        title="No Shopify store connected"
        description="Connect a Shopify store before syncing your product catalog."
        icon={<Store className="size-5" aria-hidden />}
        action={
          <Link href={ROUTES.SHOPIFY_CONNECTIONS}>
            <Button type="button">Connect Shopify Store</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="page-stack animate-fade-in-up">
      <PageHeader
        eyebrow="Commerce"
        title="Sync Products"
        description={
          returnTo
            ? "Pull the latest products from Shopify, then return to your campaign checklist."
            : "Pull the latest products, variants, and images from your connected Shopify store."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={ROUTES.PRODUCTS}>
              <Button type="button" variant="secondary" className="gap-1.5">
                <Package className="size-3.5" aria-hidden />
                View Products
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => statusQuery.refetch()}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Refresh
            </Button>
            <Button
              type="button"
              disabled={syncMutation.isPending || !canSync}
              onClick={runSync}
              className="gap-1.5"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {syncMutation.isPending ? "Syncing…" : "Sync Products"}
            </Button>
          </div>
        }
      />

      {returnTo ? (
        <Card className="text-body-sm text-muted-foreground">
          After sync completes, you will return to your campaign Publishing Checklist.
        </Card>
      ) : null}

      <ShopifyProductSyncStatusCard status={statusQuery.data} />

      {syncMutation.isSuccess && syncMutation.data ? (
        <ShopifyProductSyncSummary summary={syncMutation.data} />
      ) : (
        <Card className="text-body-sm">
          Run a sync to refresh catalog data used for AI campaign generation.
        </Card>
      )}
    </div>
  );
}
