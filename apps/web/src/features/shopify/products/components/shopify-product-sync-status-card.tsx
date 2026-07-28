"use client";

import { Card } from "@/components/ui/card";
import type { ShopifyStoreSyncStatus } from "@/features/shopify/products/types/shopify-products.types";
import { formatDateTime } from "@/utils/formatters";

interface ShopifyProductSyncStatusCardProps {
  status: ShopifyStoreSyncStatus;
}

export function ShopifyProductSyncStatusCard({ status }: ShopifyProductSyncStatusCardProps) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">Synchronization Status</h2>
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <p><span className="text-muted-foreground">Store:</span> {status.accountName}</p>
        <p><span className="text-muted-foreground">Shop:</span> {status.shop}</p>
        <p><span className="text-muted-foreground">Connection Status:</span> {status.status}</p>
        <p><span className="text-muted-foreground">Sync Status:</span> {status.syncStatus}</p>
        <p><span className="text-muted-foreground">Last Synced:</span> {status.lastSyncedAt ? formatDateTime(status.lastSyncedAt) : "N/A"}</p>
        <p><span className="text-muted-foreground">Last Successful Sync:</span> {status.lastSuccessfulSyncAt ? formatDateTime(status.lastSuccessfulSyncAt) : "N/A"}</p>
        <p><span className="text-muted-foreground">Last Failed Sync:</span> {status.lastFailedSyncAt ? formatDateTime(status.lastFailedSyncAt) : "N/A"}</p>
      </div>
    </Card>
  );
}
