"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Link2Off,
  Package,
  RefreshCw,
  Store,
  Unplug,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageGrid } from "@/components/shared/layout/page-grid";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { usePermission } from "@/hooks/use-permission";
import { AppError } from "@/lib/api/errors";
import { isAllowedShopifyAuthorizationUrl } from "@/lib/navigation/shopify-oauth";
import {
  clearJourneyReturnTo,
  peekJourneyReturnTo,
  resolveJourneyReturnTo,
} from "@/lib/navigation/journey-return";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";
import { ShopifyConnectForm } from "@/features/shopify/components/shopify-connect-form";
import {
  useConnectShopifyMutation,
  useDisconnectShopifyMutation,
  useShopifyConnectionQuery,
} from "@/features/shopify/hooks/use-shopify";
import type { ConnectShopifyFormValues } from "@/features/shopify/schemas/shopify.schemas";
import type { ShopifyConnection } from "@/features/shopify/types/shopify.types";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";
import { useDashboardSummaryQuery } from "@/features/dashboard/hooks/use-dashboard-summary-query";
import { cn } from "@/lib/utils";

function OverviewStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-muted/30 px-4 py-3">
      <p className="text-eyebrow">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-caption">{hint}</p> : null}
    </div>
  );
}

function ConnectionOverviewCard({
  connection,
  productCount,
  collectionCount,
}: {
  connection: ShopifyConnection;
  productCount: number | null;
  collectionCount: number | null;
}) {
  const syncHealthy =
    connection.connected &&
    !["FAILED", "DISCONNECTED", "REVOKED", "EXPIRED"].includes(
      String(connection.syncStatus).toUpperCase(),
    );

  return (
    <Card variant="elevated" padding="lg" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-shopify-muted text-shopify">
            <Store className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-heading truncate">{connection.accountName}</h2>
              <Badge variant="shopify">Shopify</Badge>
            </div>
            <p className="mt-1 truncate text-body-sm">{connection.shop}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={connection.status} />
          <StatusBadge status={connection.syncStatus} />
        </div>
      </div>

      <PageGrid cols={4} gap="sm">
        <OverviewStat
          label="Products synced"
          value={productCount !== null ? String(productCount) : "—"}
          hint="From catalog sync"
        />
        <OverviewStat
          label="Collections"
          value={collectionCount !== null ? String(collectionCount) : "—"}
          hint="Shopify collections"
        />
        <OverviewStat
          label="Last sync"
          value={(() => {
            const syncAt = connection.lastSuccessfulSyncAt ?? connection.lastSyncedAt;
            return syncAt ? formatDateTime(syncAt) : "Never";
          })()}
        />
        <OverviewStat
          label="Inventory"
          value="Synced"
          hint="Via product sync jobs"
        />
      </PageGrid>

      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className={cn(
            "rounded-[var(--radius-xl)] px-4 py-4",
            connection.connected ? "bg-success-muted/50" : "bg-muted/40",
          )}
        >
          <div className="flex items-center gap-2">
            <Unplug className="size-4 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">Connection</p>
          </div>
          <p className="mt-2 text-body-sm">
            {connection.connected
              ? "Store credentials are active for sync and catalog reads."
              : "Store is not actively connected. Reconnect to restore sync."}
          </p>
        </div>
        <div
          className={cn(
            "rounded-[var(--radius-xl)] px-4 py-4",
            syncHealthy ? "bg-success-muted/50" : "bg-warning-muted/40",
          )}
        >
          <div className="flex items-center gap-2">
            <Webhook className="size-4 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">Webhook & sync health</p>
          </div>
          <p className="mt-2 text-body-sm">
            Sync status: <span className="text-foreground">{connection.syncStatus}</span>
            {connection.lastFailedSyncAt
              ? ` · Last failure ${formatDateTime(connection.lastFailedSyncAt)}`
              : ""}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function ShopifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canView = usePermission("view");
  const canManage = usePermission("manage");
  const { activeStore, refreshStores } = useActiveStore();
  const dashboardQuery = useDashboardSummaryQuery(canView);

  const connectionQuery = useShopifyConnectionQuery();
  const connectMutation = useConnectShopifyMutation();
  const disconnectMutation = useDisconnectShopifyMutation();

  const connection = connectionQuery.data ?? null;
  const summary = dashboardQuery.data;
  const productCount =
    activeStore?.capabilities?.productCount ?? summary?.shopify.products ?? null;
  const collectionCount = summary?.shopify.collections ?? null;

  useEffect(() => {
    const queryReturn = searchParams.get("returnTo");
    if (queryReturn) {
      resolveJourneyReturnTo(queryReturn);
    }
  }, [searchParams]);

  useEffect(() => {
    const shopifyStatus = searchParams.get("shopify");
    if (!shopifyStatus) {
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      if (shopifyStatus === "connected") {
        toast.success("Shopify store connected successfully.");
        void Promise.all([
          connectionQuery.refetch(),
          dashboardQuery.refetch(),
          refreshStores(),
        ]).then(() => {
          if (cancelled) {
            return;
          }
          const destination =
            resolveJourneyReturnTo(searchParams.get("returnTo")) ??
            peekJourneyReturnTo();
          if (destination) {
            clearJourneyReturnTo();
            router.replace(destination);
            return;
          }
          router.replace(ROUTES.SHOPIFY);
        });
        return;
      }

      if (shopifyStatus === "error") {
        toast.error(
          searchParams.get("message") || "Shopify connection failed. Try again.",
        );
      }

      router.replace(ROUTES.SHOPIFY_CONNECTIONS);
    });

    return () => {
      cancelled = true;
    };
    // Intentionally run once when OAuth returns with query params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      toast.error(getErrorMessage(error, "Failed to start Shopify connection."));
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
      toast.success("Store disconnected.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to disconnect store."));
    }
  };

  if (!canView) {
    return (
      <PageEmpty title="Access restricted" description="Your role does not have Shopify access." />
    );
  }

  const connectionError =
    connectionQuery.isError &&
    !(connectionQuery.error instanceof AppError && connectionQuery.error.statusCode === 404)
      ? getErrorMessage(connectionQuery.error)
      : undefined;

  return (
    <div className="page-stack animate-fade-in-up">
      <PageHeader
        eyebrow="Commerce"
        title="Shopify"
        description="Manage your store connection, sync health, and catalog readiness for AI campaigns."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={ROUTES.SHOPIFY}>
              <Button type="button" variant="secondary" className="gap-1.5">
                <RefreshCw className="size-3.5" aria-hidden />
                Sync Products
              </Button>
            </Link>
            <Link href={ROUTES.PRODUCTS}>
              <Button type="button" variant="outline" className="gap-1.5">
                <Package className="size-3.5" aria-hidden />
                Browse Products
              </Button>
            </Link>
          </div>
        }
      />

      {connectionQuery.isPending ? (
        <Card variant="elevated" padding="lg" className="space-y-4" aria-busy="true">
          <Skeleton className="h-11 w-11 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <div className="grid gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </Card>
      ) : null}

      {connectionError ? (
        <PageError
          title="Unable to load Shopify connection"
          message={connectionError}
          onRetry={() => connectionQuery.refetch()}
        />
      ) : null}

      {!connectionQuery.isPending && connection ? (
        <>
          <ConnectionOverviewCard
            connection={connection}
            productCount={productCount}
            collectionCount={collectionCount}
          />

          <Card variant="elevated" padding="lg" className="space-y-4">
            <SectionHeader
              title="Connection details"
              description="Review credentials health or reconnect the same shop domain."
            />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-caption">Store name</dt>
                <dd className="mt-1 font-medium">{connection.accountName}</dd>
              </div>
              <div>
                <dt className="text-caption">Shop domain</dt>
                <dd className="mt-1 font-medium">{connection.shop}</dd>
              </div>
              <div>
                <dt className="text-caption">Account ID</dt>
                <dd className="mt-1 font-mono text-xs text-muted-foreground">{connection.accountId}</dd>
              </div>
              <div>
                <dt className="text-caption">Updated</dt>
                <dd className="mt-1">{formatDateTime(connection.updatedAt)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href={ROUTES.SHOPIFY_DETAILS}>
                <Button type="button" variant="secondary" className="gap-1.5">
                  Full details
                  <ArrowRight className="size-3.5" aria-hidden />
                </Button>
              </Link>
              <Button type="button" variant="outline" onClick={() => connectionQuery.refetch()}>
                Refresh
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="gap-1.5"
                onClick={handleDisconnect}
                disabled={!canManage || disconnectMutation.isPending}
              >
                <Link2Off className="size-3.5" aria-hidden />
                {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect"}
              </Button>
            </div>
          </Card>

          {canManage ? (
            <Card padding="lg" className="space-y-3">
              <CardHeader>
                <CardTitle>Reconnect store</CardTitle>
                <CardDescription>
                  Run OAuth again if credentials expired or you need to re-authorize scopes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ShopifyConnectForm
                  loading={connectMutation.isPending}
                  serverError={
                    connectMutation.isError ? getErrorMessage(connectMutation.error) : undefined
                  }
                  onSubmit={handleConnect}
                />
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {!connectionQuery.isPending && !connection && !connectionError ? (
        <>
          <PageEmpty
            title="No Shopify store connected"
            description="Connect a Shopify store to sync products, collections, and inventory for AI campaign generation."
            icon={<Store className="size-5" aria-hidden />}
          />
          {canManage ? (
            <Card variant="elevated" padding="lg" className="space-y-3">
              <SectionHeader
                title="Connect Shopify Store"
                description="Enter your myshopify.com domain to start secure OAuth."
              />
              <ShopifyConnectForm
                loading={connectMutation.isPending}
                serverError={
                  connectMutation.isError ? getErrorMessage(connectMutation.error) : undefined
                }
                onSubmit={handleConnect}
              />
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
