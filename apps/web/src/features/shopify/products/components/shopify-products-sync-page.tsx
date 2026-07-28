"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { ROUTES } from "@/constants/routes";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage } from "@/utils/errors";
import { useRunShopifyProductSyncMutation, useShopifyProductSyncStatusQuery } from "@/features/shopify/products/hooks/use-shopify-products-sync";
import { ShopifyProductSyncStatusCard } from "@/features/shopify/products/components/shopify-product-sync-status-card";
import { ShopifyProductSyncSummary } from "@/features/shopify/products/components/shopify-product-sync-summary";

export function ShopifyProductsSyncPageContent() {
  const canView = usePermission("view");
  const canSync = usePermission("sync");

  const statusQuery = useShopifyProductSyncStatusQuery();
  const syncMutation = useRunShopifyProductSyncMutation();

  const runSync = async () => {
    if (!canSync) {
      toast.error("Your role cannot execute Shopify product synchronization.");
      return;
    }

    try {
      const result = await syncMutation.mutateAsync();
      toast.success("Shopify products synchronized.");
      return result;
    } catch (error) {
      toast.error(getErrorMessage(error, "Shopify product synchronization failed."));
      return null;
    }
  };

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have Shopify access." />;
  }

  if (statusQuery.isError) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Unable to load Shopify synchronization status</h2>
        <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(statusQuery.error)}</p>
        <Button type="button" className="mt-3" onClick={() => statusQuery.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!statusQuery.data) {
    return (
      <div className="space-y-4">
        <PageEmpty
          title="No active Shopify connection"
          description="Connect a Shopify store before running product synchronization."
        />
        <div className="flex justify-end">
          <Link href={ROUTES.SHOPIFY_CONNECTIONS}>
            <Button type="button" variant="secondary">
              Go to Shopify Connections
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Shopify Product Synchronization</h1>
          <p className="text-sm text-muted-foreground">
            Manually synchronize Shopify products and monitor backend synchronization state.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => statusQuery.refetch()}>
            Refresh Status
          </Button>
          <Button type="button" disabled={syncMutation.isPending || !canSync} onClick={runSync}>
            {syncMutation.isPending ? "Running..." : "Run Product Sync"}
          </Button>
        </div>
      </div>

      <ShopifyProductSyncStatusCard status={statusQuery.data} />

      {syncMutation.isSuccess && syncMutation.data ? <ShopifyProductSyncSummary summary={syncMutation.data} /> : null}

      <Card className="space-y-2">
        <h2 className="text-lg font-semibold">Backend-Supported Scope</h2>
        <p className="text-sm text-muted-foreground">
          Product list, product detail endpoint, and sync history endpoints are not exposed by current Shopify controller APIs.
          This dashboard surfaces supported capabilities only: status from `/shopify/store` and manual sync via `/shopify/sync`.
        </p>
      </Card>
    </div>
  );
}
