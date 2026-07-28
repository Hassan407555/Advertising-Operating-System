"use client";

import { Card } from "@/components/ui/card";
import type { ShopifyProductsSyncSummary } from "@/features/shopify/products/types/shopify-products.types";

interface ShopifyProductSyncSummaryProps {
  summary: ShopifyProductsSyncSummary;
}

export function ShopifyProductSyncSummary({ summary }: ShopifyProductSyncSummaryProps) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">Synchronization Summary</h2>
      <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-border p-3">Products Synced: {summary.products}</div>
        <div className="rounded-md border border-border p-3">Variants Synced: {summary.variants}</div>
        <div className="rounded-md border border-border p-3">Images Synced: {summary.images}</div>
        <div className="rounded-md border border-border p-3">Duration: {summary.duration}ms</div>
      </div>
    </Card>
  );
}
