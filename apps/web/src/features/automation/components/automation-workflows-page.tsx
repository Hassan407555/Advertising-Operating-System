"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage } from "@/utils/errors";
import { AutomationWorkflowForm } from "@/features/automation/components/automation-workflow-form";
import { AutomationRunSummary } from "@/features/automation/components/automation-run-summary";
import { AutomationStepsList } from "@/features/automation/components/automation-steps-list";
import {
  useAutomationAdAccountOptionsQuery,
  useAutomationCampaignOptionsQuery,
  useRunCampaignWorkflowMutation,
  useRunFullWorkflowMutation,
  useRunPublishWorkflowMutation,
  useWorkflowStatusQuery,
} from "@/features/automation/hooks/use-automation";
import type { AutomationWorkflowFormValues } from "@/features/automation/schemas/automation.schemas";

export function AutomationWorkflowsPageContent() {
  const canView = usePermission("view");
  const canRun = usePermission("run");

  const campaignsQuery = useAutomationCampaignOptionsQuery();
  const adAccountsQuery = useAutomationAdAccountOptionsQuery();
  const runCampaignMutation = useRunCampaignWorkflowMutation();
  const runPublishMutation = useRunPublishWorkflowMutation();
  const runFullMutation = useRunFullWorkflowMutation();
  const [lastWorkflowInput, setLastWorkflowInput] = useState<AutomationWorkflowFormValues | null>(null);
  const [runId, setRunId] = useState<string | undefined>(undefined);
  const workflowQuery = useWorkflowStatusQuery(runId);

  const runAnyPending = runCampaignMutation.isPending || runPublishMutation.isPending || runFullMutation.isPending;
  const toArray = (value: string) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  const executeWorkflow = async (values: AutomationWorkflowFormValues) => {
    if (!canRun) {
      toast.error("Your role does not allow workflow execution.");
      return;
    }

    try {
      const run =
        values.workflowType === "campaign"
          ? await runCampaignMutation.mutateAsync({
              ...values.campaign,
              countries: toArray(values.campaign.countries),
              platforms: toArray(values.campaign.platforms),
              adAccountIds: values.campaign.adAccountIds,
              currency: values.campaign.currency || undefined,
            })
          : values.workflowType === "publish"
            ? await runPublishMutation.mutateAsync({
                campaignId: values.publish.campaignId || undefined,
                campaignIds: values.publish.campaignIds ? toArray(values.publish.campaignIds) : undefined,
                adAccountId: values.publish.adAccountId || undefined,
                platform: values.publish.platform || undefined,
              })
            : await runFullMutation.mutateAsync({
                ...values.full,
                countries: toArray(values.full.countries),
                platforms: toArray(values.full.platforms),
                adAccountIds: values.full.adAccountIds,
                currency: values.full.currency || undefined,
              });

      setLastWorkflowInput(values);
      setRunId(run.id);
      toast.success(`Workflow started. Run ID: ${run.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Workflow execution failed."));
    }
  };

  const retryWorkflow = async () => {
    if (!lastWorkflowInput) {
      return;
    }
    await executeWorkflow(lastWorkflowInput);
  };

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have access to automation workflows." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Automation Workflows</h1>
        <p className="text-sm text-muted-foreground">
          Execute campaign, publish, and full automation workflows, then monitor run progress and step results.
        </p>
      </div>

      {campaignsQuery.isError || adAccountsQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load workflow options</h2>
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

      <AutomationWorkflowForm
        campaigns={campaignsQuery.data ?? []}
        adAccounts={adAccountsQuery.data ?? []}
        loading={runAnyPending}
        serverError={
          runCampaignMutation.isError
            ? getErrorMessage(runCampaignMutation.error)
            : runPublishMutation.isError
              ? getErrorMessage(runPublishMutation.error)
              : runFullMutation.isError
                ? getErrorMessage(runFullMutation.error)
                : undefined
        }
        onSubmit={executeWorkflow}
      />

      {workflowQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load workflow status</h2>
          <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(workflowQuery.error)}</p>
          <Button type="button" className="mt-3" onClick={() => workflowQuery.refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {workflowQuery.data ? (
        <>
          <AutomationRunSummary run={workflowQuery.data} onRetry={retryWorkflow} />
          <AutomationStepsList steps={workflowQuery.data.steps} />
        </>
      ) : null}
    </div>
  );
}
