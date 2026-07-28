"use client";

import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ShopifyStoreSyncStatus } from "@/features/shopify/products/types/shopify-products.types";
import { formatDateTime } from "@/utils/formatters";

interface ShopifyProductSyncStatusCardProps {
  status: ShopifyStoreSyncStatus;
}

export function ShopifyProductSyncStatusCard({ status }: ShopifyProductSyncStatusCardProps) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">Sync status</h2>
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Store:</span> {status.accountName}
        </p>
        <p>
          <span className="text-muted-foreground">Shop:</span> {status.shop}
        </p>
        <p className="flex items-center gap-2">
          <span className="text-muted-foreground">Connection:</span>
          <StatusBadge status={status.status} />
        </p>
        <p className="flex items-center gap-2">
          <span className="text-muted-foreground">Sync:</span>
          <StatusBadge status={status.syncStatus} />
        </p>
        <p>
          <span className="text-muted-foreground">Last synced:</span>{" "}
          {status.lastSyncedAt ? formatDateTime(status.lastSyncedAt) : "N/A"}
        </p>
        <p>
          <span className="text-muted-foreground">Last successful sync:</span>{" "}
          {status.lastSuccessfulSyncAt ? formatDateTime(status.lastSuccessfulSyncAt) : "N/A"}
        </p>
      </div>
    </Card>
  );
}
