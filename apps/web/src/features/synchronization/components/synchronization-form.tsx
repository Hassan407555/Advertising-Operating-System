"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Campaign } from "@/types/campaign";
import type { AdAccount } from "@/types/ad-account";
import { synchronizationFormSchema, type SynchronizationFormValues } from "@/features/synchronization/schemas/synchronization.schemas";

interface SynchronizationFormProps {
  campaigns: Campaign[];
  adAccounts: AdAccount[];
  loading: boolean;
  serverError?: string;
  onSubmit: (values: SynchronizationFormValues) => Promise<void>;
  onCancel: () => void;
}

export function SynchronizationForm({
  campaigns,
  adAccounts,
  loading,
  serverError,
  onSubmit,
  onCancel,
}: SynchronizationFormProps) {
  const form = useForm<SynchronizationFormValues>({
    defaultValues: {
      targetType: "campaign",
      campaignId: "",
      adAccountId: "",
      statusCampaignId: "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const targetType = form.watch("targetType");

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [form.formState.isDirty]);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const parsed = synchronizationFormSchema.safeParse(values);
        if (!parsed.success) {
          parsed.error.issues.forEach((issue) => {
            const path = issue.path[0];
            if (typeof path === "string") {
              form.setError(path as keyof SynchronizationFormValues, { message: issue.message });
            }
          });
          return;
        }

        await onSubmit(parsed.data);
      })}
    >
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Synchronization Target</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value="campaign"
              checked={targetType === "campaign"}
              onChange={() => form.setValue("targetType", "campaign", { shouldDirty: true })}
            />
            Campaign synchronization
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value="account"
              checked={targetType === "account"}
              onChange={() => form.setValue("targetType", "account", { shouldDirty: true })}
            />
            Account synchronization
          </label>
        </div>

        {targetType === "campaign" ? (
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="campaignId">
              Campaign
            </label>
            <select
              id="campaignId"
              className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
              {...form.register("campaignId")}
            >
              <option value="">Select campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} ({campaign.adAccount?.platform ?? "N/A"})
                </option>
              ))}
            </select>
            {form.formState.errors.campaignId?.message ? (
              <p className="text-xs text-red-400">{form.formState.errors.campaignId.message}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="adAccountId">
              Ad Account
            </label>
            <select
              id="adAccountId"
              className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
              {...form.register("adAccountId")}
            >
              <option value="">Select ad account</option>
              {adAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName} ({account.platform})
                </option>
              ))}
            </select>
            {form.formState.errors.adAccountId?.message ? (
              <p className="text-xs text-red-400">{form.formState.errors.adAccountId.message}</p>
            ) : null}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Campaign Sync Status Lookup</h2>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="statusCampaignId">
            Campaign for status lookup (optional)
          </label>
          <select
            id="statusCampaignId"
            className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
            {...form.register("statusCampaignId")}
          >
            <option value="">Select campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <FormErrorBanner message={serverError} />

      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Synchronizing..." : "Run Synchronization"}
        </Button>
      </FormActions>
    </form>
  );
}
