"use client";

import { Card } from "@/components/ui/card";
import type { ShopifyConnection } from "@/features/shopify/types/shopify.types";
import { formatDateTime } from "@/utils/formatters";

interface ShopifyConnectionHealthProps {
  connection: ShopifyConnection;
}

export function ShopifyConnectionHealth({ connection }: ShopifyConnectionHealthProps) {
  return (
    <Card className="space-y-2">
      <h3 className="text-lg font-semibold">Connection Health</h3>
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <p><span className="text-muted-foreground">API Connectivity:</span> {connection.status}</p>
        <p><span className="text-muted-foreground">Authentication Status:</span> {connection.syncStatus}</p>
        <p><span className="text-muted-foreground">Last Synced:</span> {connection.lastSyncedAt ? formatDateTime(connection.lastSyncedAt) : "N/A"}</p>
        <p><span className="text-muted-foreground">Last Successful Sync:</span> {connection.lastSuccessfulSyncAt ? formatDateTime(connection.lastSuccessfulSyncAt) : "N/A"}</p>
        <p><span className="text-muted-foreground">Last Failed Sync:</span> {connection.lastFailedSyncAt ? formatDateTime(connection.lastFailedSyncAt) : "N/A"}</p>
      </div>
    </Card>
  );
}
