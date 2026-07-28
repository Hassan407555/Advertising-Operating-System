"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { ROUTES } from "@/constants/routes";
import { usePermission } from "@/hooks/use-permission";
import { AppError } from "@/lib/api/errors";
import { isAllowedShopifyAuthorizationUrl } from "@/lib/navigation/shopify-oauth";
import { getErrorMessage } from "@/utils/errors";
import { ShopifyConnectForm } from "@/features/shopify/components/shopify-connect-form";
import { ShopifyConnectionHealth } from "@/features/shopify/components/shopify-connection-health";
import { ShopifyConnectionsTable } from "@/features/shopify/components/shopify-connections-table";
import { useConnectShopifyMutation, useDisconnectShopifyMutation, useShopifyConnectionQuery } from "@/features/shopify/hooks/use-shopify";
import type { ConnectShopifyFormValues } from "@/features/shopify/schemas/shopify.schemas";

export function ShopifyPageContent() {
  const canView = usePermission("view");
  const canManage = usePermission("manage");

  const connectionQuery = useShopifyConnectionQuery();
  const connectMutation = useConnectShopifyMutation();
  const disconnectMutation = useDisconnectShopifyMutation();

  const connection = connectionQuery.data ?? null;

  const handleConnect = async (values: ConnectShopifyFormValues) => {
    if (!canManage) {
      toast.error("Your role cannot manage Shopify connections.");
      return;
    }

    try {
      const response = await connectMutation.mutateAsync(values);
      if (!isAllowedShopifyAuthorizationUrl(response.authorizationUrl)) {
        toast.error("Shopify returned an unexpected authorization URL.");
        return;
      }
      window.location.href = response.authorizationUrl;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to start Shopify OAuth."));
    }
  };

  const handleDisconnect = async () => {
    if (!canManage) {
      toast.error("Your role cannot manage Shopify connections.");
      return;
    }

    try {
      await disconnectMutation.mutateAsync();
      await connectionQuery.refetch();
      toast.success("Shopify store disconnected.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to disconnect Shopify store."));
    }
  };

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have Shopify access." />;
  }

  const connectionError =
    connectionQuery.isError && !(connectionQuery.error instanceof AppError && connectionQuery.error.statusCode === 404)
      ? getErrorMessage(connectionQuery.error)
      : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Shopify Connections</h1>
          <p className="text-sm text-muted-foreground">Establish and manage your Shopify store connection.</p>
        </div>
        <Link href={ROUTES.SHOPIFY_DETAILS}>
          <Button type="button" variant="secondary" disabled={!connection}>
            View Connection Details
          </Button>
        </Link>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">{connection ? "Reconnect Shopify Store" : "Connect Shopify Store"}</h2>
        <ShopifyConnectForm
          loading={connectMutation.isPending}
          serverError={connectMutation.isError ? getErrorMessage(connectMutation.error) : undefined}
          onSubmit={handleConnect}
        />
      </Card>

      {connectionError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load Shopify connection</h2>
          <p className="mt-1 text-sm text-muted-foreground">{connectionError}</p>
          <Button type="button" className="mt-3" onClick={() => connectionQuery.refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Connections</h2>
        <ShopifyConnectionsTable connection={connection} loading={connectionQuery.isPending} />
      </Card>

      {connection ? <ShopifyConnectionHealth connection={connection} /> : null}

      {connection ? (
        <Card className="space-y-2">
          <h3 className="text-lg font-semibold">Connection Actions</h3>
          <p className="text-sm text-muted-foreground">
            Disconnect deactivates the current Shopify credentials. Reconnect by running the OAuth flow again.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => connectionQuery.refetch()}>
              Refresh
            </Button>
            <Button type="button" variant="outline" onClick={handleDisconnect} disabled={disconnectMutation.isPending}>
              {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect Store"}
            </Button>
          </div>
        </Card>
      ) : (
        <PageEmpty
          title="No connected Shopify store"
          description="Connect a Shopify store to enable Shopify-related workflows."
        />
      )}
    </div>
  );
}
