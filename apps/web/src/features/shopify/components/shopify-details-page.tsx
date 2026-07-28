"use client";

import { Card } from "@/components/ui/card";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { usePermission } from "@/hooks/use-permission";
import { AppError } from "@/lib/api/errors";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";
import { useShopifyConnectionQuery } from "@/features/shopify/hooks/use-shopify";

export function ShopifyDetailsPageContent() {
  const canView = usePermission("view");
  const connectionQuery = useShopifyConnectionQuery();

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have Shopify access." />;
  }

  if (connectionQuery.isError) {
    if (connectionQuery.error instanceof AppError && connectionQuery.error.statusCode === 404) {
      return <PageEmpty title="No Shopify connection" description="Connect a Shopify store first." />;
    }

    return (
      <Card>
        <h2 className="text-lg font-semibold">Unable to load Shopify details</h2>
        <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(connectionQuery.error)}</p>
      </Card>
    );
  }

  if (!connectionQuery.data) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Loading Shopify connection details...</p>
      </Card>
    );
  }

  const connection = connectionQuery.data;

  return (
    <Card className="space-y-3">
      <h1 className="text-2xl font-semibold">Shopify Connection Details</h1>
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <p><span className="text-muted-foreground">Connection ID:</span> {connection.id}</p>
        <p><span className="text-muted-foreground">Platform:</span> {connection.platform}</p>
        <p><span className="text-muted-foreground">Store ID:</span> {connection.accountId}</p>
        <p><span className="text-muted-foreground">Store Name:</span> {connection.accountName}</p>
        <p><span className="text-muted-foreground">Shop Domain:</span> {connection.shop}</p>
        <p><span className="text-muted-foreground">Connection Status:</span> {connection.status}</p>
        <p><span className="text-muted-foreground">Sync Status:</span> {connection.syncStatus}</p>
        <p><span className="text-muted-foreground">Connected:</span> {connection.connected ? "Yes" : "No"}</p>
        <p><span className="text-muted-foreground">Last Synced:</span> {connection.lastSyncedAt ? formatDateTime(connection.lastSyncedAt) : "N/A"}</p>
        <p><span className="text-muted-foreground">Last Successful Sync:</span> {connection.lastSuccessfulSyncAt ? formatDateTime(connection.lastSuccessfulSyncAt) : "N/A"}</p>
        <p><span className="text-muted-foreground">Last Failed Sync:</span> {connection.lastFailedSyncAt ? formatDateTime(connection.lastFailedSyncAt) : "N/A"}</p>
        <p><span className="text-muted-foreground">Created:</span> {formatDateTime(connection.createdAt)}</p>
        <p><span className="text-muted-foreground">Updated:</span> {formatDateTime(connection.updatedAt)}</p>
      </div>
    </Card>
  );
}
