"use client";

import { Card } from "@/components/ui/card";
import { PageGrid } from "@/components/shared/layout/page-grid";
import { SectionHeader } from "@/components/shared/section-header";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ShopifyStoreSyncStatus } from "@/features/shopify/products/types/shopify-products.types";
import { formatDateTime } from "@/utils/formatters";

interface ShopifyProductSyncStatusCardProps {
  status: ShopifyStoreSyncStatus;
}

export function ShopifyProductSyncStatusCard({ status }: ShopifyProductSyncStatusCardProps) {
  return (
    <Card variant="elevated" padding="lg" className="space-y-5">
      <SectionHeader
        title="Sync status"
        description={`${status.accountName} · ${status.shop}`}
      />
      <PageGrid cols={2} gap="sm">
        <div className="rounded-[var(--radius-xl)] bg-muted/30 px-4 py-3">
          <p className="text-caption">Connection</p>
          <div className="mt-2">
            <StatusBadge status={status.status} />
          </div>
        </div>
        <div className="rounded-[var(--radius-xl)] bg-muted/30 px-4 py-3">
          <p className="text-caption">Sync</p>
          <div className="mt-2">
            <StatusBadge status={status.syncStatus} />
          </div>
        </div>
        <div className="rounded-[var(--radius-xl)] bg-muted/30 px-4 py-3">
          <p className="text-caption">Last synced</p>
          <p className="mt-1 text-sm font-medium">
            {status.lastSyncedAt ? formatDateTime(status.lastSyncedAt) : "Never"}
          </p>
        </div>
        <div className="rounded-[var(--radius-xl)] bg-muted/30 px-4 py-3">
          <p className="text-caption">Last successful sync</p>
          <p className="mt-1 text-sm font-medium">
            {status.lastSuccessfulSyncAt
              ? formatDateTime(status.lastSuccessfulSyncAt)
              : "Never"}
          </p>
        </div>
      </PageGrid>
    </Card>
  );
}
