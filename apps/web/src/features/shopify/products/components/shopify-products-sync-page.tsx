"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/states/page-loading";
import { ROUTES } from "@/constants/routes";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage } from "@/utils/errors";
import {
  useRunShopifyProductSyncMutation,
  useShopifyProductSyncStatusQuery,
} from "@/features/shopify/products/hooks/use-shopify-products-sync";
import { ShopifyProductSyncStatusCard } from "@/features/shopify/products/components/shopify-product-sync-status-card";
import { ShopifyProductSyncSummary } from "@/features/shopify/products/components/shopify-product-sync-summary";

export function ShopifyProductsSyncPageContent() {
  const canView = usePermission("view");
  const canSync = usePermission("sync");

  const statusQuery = useShopifyProductSyncStatusQuery();
  const syncMutation = useRunShopifyProductSyncMutation();

  const runSync = async () => {
    if (!canSync) {
      toast.error("Your role cannot sync products.");
      return;
    }

    try {
      const result = await syncMutation.mutateAsync();
      toast.success("Products synced.");
      return result;
    } catch (error) {
      toast.error(getErrorMessage(error, "Product sync failed."));
      return null;
    }
  };

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have Shopify access." />;
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
        title="No stores connected"
        description="Connect a Shopify store before syncing products."
        action={
          <Link href={ROUTES.SHOPIFY_CONNECTIONS}>
            <Button type="button">Connect Shopify Store</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sync Products"
        description="Pull the latest products from your connected Shopify store."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={ROUTES.PRODUCTS}>
              <Button type="button" variant="secondary">
                View Products
              </Button>
            </Link>
            <Button type="button" variant="secondary" onClick={() => statusQuery.refetch()}>
              Refresh
            </Button>
            <Button type="button" disabled={syncMutation.isPending || !canSync} onClick={runSync}>
              {syncMutation.isPending ? "Syncing…" : "Sync Products"}
            </Button>
          </div>
        }
      />

      <ShopifyProductSyncStatusCard status={statusQuery.data} />

      {syncMutation.isSuccess && syncMutation.data ? (
        <ShopifyProductSyncSummary summary={syncMutation.data} />
      ) : null}
    </div>
  );
}
