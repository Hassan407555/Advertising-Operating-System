"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage } from "@/utils/errors";
import { SynchronizationForm } from "@/features/synchronization/components/synchronization-form";
import { SynchronizationResultSummary } from "@/features/synchronization/components/synchronization-result-summary";
import { CampaignSyncStatusCard } from "@/features/synchronization/components/campaign-sync-status-card";
import {
  useCampaignSyncStatusQuery,
  useSynchronizationAdAccountOptionsQuery,
  useSynchronizationCampaignOptionsQuery,
  useSyncAccountMutation,
  useSyncCampaignMutation,
} from "@/features/synchronization/hooks/use-synchronization";
import type { SynchronizationFormValues } from "@/features/synchronization/schemas/synchronization.schemas";
import type { SyncResultResponse } from "@/features/synchronization/types/synchronization.types";

export function SynchronizationPageContent() {
  const canView = usePermission("view");
  const canSync = usePermission("sync");

  const campaignsQuery = useSynchronizationCampaignOptionsQuery();
  const adAccountsQuery = useSynchronizationAdAccountOptionsQuery();
  const syncCampaignMutation = useSyncCampaignMutation();
  const syncAccountMutation = useSyncAccountMutation();
  const [statusCampaignId, setStatusCampaignId] = useState<string | undefined>(undefined);
  const statusQuery = useCampaignSyncStatusQuery(statusCampaignId);
  const [lastRun, setLastRun] = useState<{ targetType: "campaign" | "account"; id: string } | null>(null);
  const [result, setResult] = useState<SyncResultResponse | null>(null);

  const executeSync = async (values: SynchronizationFormValues) => {
    if (!canSync) {
      toast.error("Your role cannot execute synchronization.");
      return;
    }

    try {
      let response: SyncResultResponse;

      if (values.targetType === "campaign") {
        response = await syncCampaignMutation.mutateAsync(values.campaignId as string);
        setLastRun({ targetType: "campaign", id: values.campaignId as string });
        setStatusCampaignId(values.campaignId);
      } else {
        response = await syncAccountMutation.mutateAsync(values.adAccountId as string);
        setLastRun({ targetType: "account", id: values.adAccountId as string });
      }

      setResult(response);
      toast.success(`Synchronization finished with status: ${response.status}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Synchronization failed."));
    }
  };

  const retrySync = async () => {
    if (!lastRun) {
      return;
    }

    try {
      const response =
        lastRun.targetType === "campaign"
          ? await syncCampaignMutation.mutateAsync(lastRun.id)
          : await syncAccountMutation.mutateAsync(lastRun.id);
      setResult(response);
      toast.success(`Retry finished with status: ${response.status}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Retry failed."));
    }
  };

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have access to synchronization." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Synchronization</h1>
        <p className="text-sm text-muted-foreground">
          Sync campaign and ad account state from external ad platforms.
        </p>
      </div>

      {campaignsQuery.isError || adAccountsQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load synchronization options</h2>
          <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(campaignsQuery.error ?? adAccountsQuery.error)}</p>
          <Button
            type="button"
            className="mt-3"
            onClick={() => {
              campaignsQuery.refetch();
              adAccountsQuery.refetch();
            }}
          >
            Retry
          </Button>
        </Card>
      ) : null}

      <SynchronizationForm
        campaigns={campaignsQuery.data ?? []}
        adAccounts={adAccountsQuery.data ?? []}
        loading={syncCampaignMutation.isPending || syncAccountMutation.isPending}
        serverError={
          syncCampaignMutation.isError
            ? getErrorMessage(syncCampaignMutation.error)
            : syncAccountMutation.isError
              ? getErrorMessage(syncAccountMutation.error)
              : undefined
        }
        onSubmit={executeSync}
        onCancel={() => setResult(null)}
      />

      <Card className="space-y-2">
        <h2 className="text-lg font-semibold">Status Lookup</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 min-w-[240px] rounded-md border border-border bg-transparent px-3 text-sm"
            value={statusCampaignId ?? ""}
            onChange={(event) => setStatusCampaignId(event.target.value || undefined)}
          >
            <option value="">Select campaign for status</option>
            {(campaignsQuery.data ?? []).map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="secondary" onClick={() => statusQuery.refetch()} disabled={!statusCampaignId}>
            Refresh Status
          </Button>
        </div>
      </Card>

      {statusQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to fetch sync status</h2>
          <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(statusQuery.error)}</p>
          <Button className="mt-3" type="button" onClick={() => statusQuery.refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {statusQuery.data ? <CampaignSyncStatusCard status={statusQuery.data} /> : null}

      {result ? <SynchronizationResultSummary result={result} onRetry={retrySync} /> : null}

      {!canSync ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            You can view synchronization status, but execution is restricted for your role.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
