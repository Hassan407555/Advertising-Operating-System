"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MARKETING_GOAL_OPTIONS } from "@/features/campaign-generator/constants/campaign-generator-options";
import { automationWorkflowSchema } from "@/features/automation/schemas/automation.schemas";
import type { AutomationWorkflowFormValues } from "@/features/automation/schemas/automation.schemas";
import type { AdAccount } from "@/types/ad-account";
import type { Campaign } from "@/types/campaign";

interface AutomationWorkflowFormProps {
  campaigns: Campaign[];
  adAccounts: AdAccount[];
  loading: boolean;
  serverError?: string;
  onSubmit: (values: AutomationWorkflowFormValues) => Promise<void>;
}

export function AutomationWorkflowForm({
  campaigns,
  adAccounts,
  loading,
  serverError,
  onSubmit,
}: AutomationWorkflowFormProps) {
  const form = useForm<AutomationWorkflowFormValues>({
    defaultValues: {
      workflowType: "campaign",
      campaign: {
        productId: "",
        countries: "",
        platforms: "",
        dailyBudget: 1,
        language: "en",
        marketingGoal: "AWARENESS",
        adAccountIds: {},
        currency: "",
      },
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const workflowType = form.watch("workflowType");

  const adAccountOptions = useMemo(
    () => adAccounts.map((account) => ({ value: account.id, label: `${account.accountName} (${account.platform})` })),
    [adAccounts],
  );

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const parsed = automationWorkflowSchema.safeParse(values);
        if (!parsed.success) {
          parsed.error.issues.forEach((issue) => {
            const path = issue.path.join(".");
            form.setError(path as never, { message: issue.message });
          });
          return;
        }
        await onSubmit(parsed.data);
      })}
    >
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Workflow Type</h2>
        <select
          className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
          value={workflowType}
          onChange={(event) => {
            const value = event.target.value as AutomationWorkflowFormValues["workflowType"];
            if (value === "campaign") {
              form.reset({
                workflowType: "campaign",
                campaign: {
                  productId: "",
                  countries: "",
                  platforms: "",
                  dailyBudget: 1,
                  language: "en",
                  marketingGoal: "AWARENESS",
                  adAccountIds: {},
                  currency: "",
                },
              });
            } else if (value === "publish") {
              form.reset({
                workflowType: "publish",
                publish: { campaignId: "", campaignIds: "", platform: "", adAccountId: "" },
              });
            } else {
              form.reset({
                workflowType: "full",
                full: {
                  productId: "",
                  countries: "",
                  platforms: "",
                  dailyBudget: 1,
                  language: "en",
                  marketingGoal: "AWARENESS",
                  adAccountIds: {},
                  currency: "",
                },
              });
            }
          }}
        >
          <option value="campaign">Campaign Workflow</option>
          <option value="publish">Publish Workflow</option>
          <option value="full">Full Workflow</option>
        </select>
      </Card>

      {workflowType === "publish" ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Publish Workflow Input</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Campaign</label>
              <select
                className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
                {...form.register("publish.campaignId")}
              >
                <option value="">Select campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Ad Account</label>
              <select
                className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
                {...form.register("publish.adAccountId")}
              >
                <option value="">Select ad account</option>
                {adAccountOptions.map((account) => (
                  <option key={account.value} value={account.value}>
                    {account.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Campaign IDs (comma-separated)</label>
            <input className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm" {...form.register("publish.campaignIds")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Platform</label>
            <input className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm" {...form.register("publish.platform")} />
          </div>
        </Card>
      ) : (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">{workflowType === "campaign" ? "Campaign Workflow Input" : "Full Workflow Input"}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Product ID</label>
              <input
                className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
                {...form.register(`${workflowType}.productId` as const)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Daily Budget</label>
              <input
                type="number"
                min={1}
                className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
                {...form.register(`${workflowType}.dailyBudget` as const)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Language</label>
              <input
                className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
                {...form.register(`${workflowType}.language` as const)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Marketing Goal</label>
              <select
                className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
                {...form.register(`${workflowType}.marketingGoal` as const)}
              >
                {MARKETING_GOAL_OPTIONS.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Countries (comma-separated)</label>
            <input className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm" {...form.register(`${workflowType}.countries` as const)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Platforms (comma-separated)</label>
            <input className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm" {...form.register(`${workflowType}.platforms` as const)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Currency (optional)</label>
            <input className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm" {...form.register(`${workflowType}.currency` as const)} />
          </div>
        </Card>
      )}

      <FormErrorBanner message={serverError} />

      <FormActions>
        <Button type="button" variant="secondary" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Running workflow..." : "Run Workflow"}
        </Button>
      </FormActions>
    </form>
  );
}
