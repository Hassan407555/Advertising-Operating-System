"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/states/page-loading";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/use-permission";
import { getAdAccountsForCampaigns } from "@/features/campaigns/api/ad-accounts.api";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";
import {
  useActiveStoreSummaryQuery,
  useAdvertisingConfigurationQuery,
  useUpsertAdvertisingConfigurationMutation,
} from "@/features/stores/hooks/use-advertising-configuration";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { apiClient } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/response";
import type { PaginatedResponse } from "@/types/api";
import { getErrorMessage } from "@/utils/errors";

interface MetaConnectionOption {
  id: string;
  accountName: string;
  accountId: string;
  status: string;
}

async function listMetaConnections(): Promise<MetaConnectionOption[]> {
  const response = await apiClient.get("/platform-connections", {
    params: {
      platform: "META",
      status: "ACTIVE",
      page: 1,
      limit: 100,
      sortBy: "accountName",
      sortOrder: "asc",
    },
  });
  const payload = unwrapEnvelope<PaginatedResponse<MetaConnectionOption>>(response.data);
  return payload.data ?? [];
}

function AdvertisingConfigurationForm() {
  const canManage = usePermission("manage");
  const { activeStore, refreshStores } = useActiveStore();
  const storeId = activeStore!.id;

  const summaryQuery = useActiveStoreSummaryQuery();
  const configQuery = useAdvertisingConfigurationQuery(storeId);
  const saveMutation = useUpsertAdvertisingConfigurationMutation(storeId);

  const adAccountsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_ACCOUNTS,
    queryFn: getAdAccountsForCampaigns,
  });

  const metaConnectionsQuery = useQuery({
    queryKey: [...QUERY_KEYS.STORES, "meta-connections"],
    queryFn: listMetaConnections,
  });

  const [metaPlatformConnectionId, setMetaPlatformConnectionId] = useState("");
  const [metaBusinessId, setMetaBusinessId] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [catalogId, setCatalogId] = useState("");

  useEffect(() => {
    const config = configQuery.data;
    if (!config) {
      return;
    }
    setMetaPlatformConnectionId(config.metaPlatformConnectionId ?? "");
    setMetaBusinessId(config.metaBusinessId ?? "");
    setAdAccountId(config.adAccountId ?? "");
    setFacebookPageId(config.facebookPageId ?? "");
    setInstagramAccountId(config.instagramAccountId ?? "");
    setPixelId(config.pixelId ?? "");
    setCatalogId(config.catalogId ?? "");
  }, [configQuery.data]);

  const summary = summaryQuery.data;
  const capabilities = summary?.capabilities;
  const metaAdAccounts = (adAccountsQuery.data ?? []).filter(
    (account) => account.platform === "META" || !account.platform,
  );

  const isLoading = summaryQuery.isLoading || configQuery.isLoading;
  const hasError = summaryQuery.isError || configQuery.isError;

  const onSave = async () => {
    try {
      await saveMutation.mutateAsync({
        metaPlatformConnectionId: metaPlatformConnectionId || null,
        metaBusinessId: metaBusinessId || null,
        adAccountId: adAccountId || null,
        facebookPageId: facebookPageId || null,
        instagramAccountId: instagramAccountId || null,
        pixelId: pixelId || null,
        catalogId: catalogId || null,
      });
      await refreshStores();
      toast.success("Advertising configuration saved.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save advertising configuration."));
    }
  };

  if (isLoading) {
    return <PageLoading cards={2} />;
  }

  if (hasError) {
    return (
      <PageError
        title="Unable to load advertising configuration"
        message={getErrorMessage(
          summaryQuery.error ?? configQuery.error,
          "Advertising configuration could not be loaded.",
        )}
        onRetry={() => {
          summaryQuery.refetch();
          configQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Advertising Configuration"
        description={`Configure Meta advertising destinations for store ${activeStore!.name}.`}
      />

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Store readiness</h2>
          <StatusBadge status={summary?.health?.status ?? "NOT_READY"} />
        </div>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>{capabilities?.shopifyConnected ? "✓" : "✗"} Shopify connected</li>
          <li>
            {capabilities?.productsSynced ? "✓" : "✗"} Products synced
            {typeof capabilities?.productCount === "number"
              ? ` (${capabilities.productCount})`
              : ""}
          </li>
          <li>{capabilities?.metaConnected ? "✓" : "✗"} Meta connected</li>
          <li>{capabilities?.adAccountSelected ? "✓" : "✗"} Ad account selected</li>
          <li>{capabilities?.facebookPageSelected ? "✓" : "○"} Facebook Page</li>
          <li>{capabilities?.instagramSelected ? "✓" : "○"} Instagram</li>
          <li>{capabilities?.pixelSelected ? "✓" : "○"} Pixel</li>
          <li>{capabilities?.catalogSelected ? "✓" : "○"} Catalog</li>
        </ul>
        <p className="text-sm">
          Ready to advertise:{" "}
          <strong>{summary?.advertisingReady ? "Yes" : "No"}</strong>
        </p>
        {summary?.health?.reasons?.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {summary.health.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Meta resources</h2>
        {!canManage ? (
          <p className="text-sm text-muted-foreground">
            You can view configuration. Only owners and admins can save changes.
          </p>
        ) : null}

        <label className="block space-y-1 text-sm">
          <span>Meta connection</span>
          <select
            className="h-9 w-full rounded-md border border-border bg-transparent px-3"
            value={metaPlatformConnectionId}
            disabled={!canManage || saveMutation.isPending}
            onChange={(event) => setMetaPlatformConnectionId(event.target.value)}
          >
            <option value="">Not selected</option>
            {(metaConnectionsQuery.data ?? []).map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.accountName || connection.accountId}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span>Meta Business ID</span>
          <input
            className="h-9 w-full rounded-md border border-border bg-transparent px-3"
            value={metaBusinessId}
            disabled={!canManage || saveMutation.isPending}
            onChange={(event) => setMetaBusinessId(event.target.value)}
            placeholder="External Meta Business Manager ID"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Ad account</span>
          <select
            className="h-9 w-full rounded-md border border-border bg-transparent px-3"
            value={adAccountId}
            disabled={!canManage || saveMutation.isPending || adAccountsQuery.isLoading}
            onChange={(event) => setAdAccountId(event.target.value)}
          >
            <option value="">Not selected</option>
            {metaAdAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.accountName} ({account.externalId})
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span>Facebook Page ID</span>
          <input
            className="h-9 w-full rounded-md border border-border bg-transparent px-3"
            value={facebookPageId}
            disabled={!canManage || saveMutation.isPending}
            onChange={(event) => setFacebookPageId(event.target.value)}
            placeholder="External Facebook Page ID"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Instagram account ID</span>
          <input
            className="h-9 w-full rounded-md border border-border bg-transparent px-3"
            value={instagramAccountId}
            disabled={!canManage || saveMutation.isPending}
            onChange={(event) => setInstagramAccountId(event.target.value)}
            placeholder="External Instagram account ID"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Pixel ID</span>
          <input
            className="h-9 w-full rounded-md border border-border bg-transparent px-3"
            value={pixelId}
            disabled={!canManage || saveMutation.isPending}
            onChange={(event) => setPixelId(event.target.value)}
            placeholder="External Pixel ID"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Catalog ID</span>
          <input
            className="h-9 w-full rounded-md border border-border bg-transparent px-3"
            value={catalogId}
            disabled={!canManage || saveMutation.isPending}
            onChange={(event) => setCatalogId(event.target.value)}
            placeholder="External Product Catalog ID"
          />
        </label>

        {canManage ? (
          <Button type="button" onClick={onSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save configuration"}
          </Button>
        ) : null}
      </Card>
    </div>
  );
}

export function AdvertisingConfigurationPage() {
  return (
    <RequireActiveStore>
      <AdvertisingConfigurationForm />
    </RequireActiveStore>
  );
}
