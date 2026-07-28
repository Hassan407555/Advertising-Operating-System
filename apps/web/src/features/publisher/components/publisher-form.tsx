"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Campaign } from "@/types/campaign";
import type { AdAccount } from "@/types/ad-account";
import type { PublisherPlatformsResponse } from "@/features/publisher/types/publisher.types";
import { publisherFormSchema, type PublisherFormValues } from "@/features/publisher/schemas/publisher.schemas";

interface PublisherFormProps {
  campaigns: Campaign[];
  adAccounts: AdAccount[];
  platforms?: PublisherPlatformsResponse;
  loading: boolean;
  serverError?: string;
  onSubmit: (values: PublisherFormValues) => Promise<void>;
  onCancel: () => void;
}

export function PublisherForm({
  campaigns,
  adAccounts,
  platforms,
  loading,
  serverError,
  onSubmit,
  onCancel,
}: PublisherFormProps) {
  const form = useForm<PublisherFormValues>({
    defaultValues: {
      campaignId: "",
      platform: "META",
      adAccountId: "",
      dryRun: true,
      pageId: "",
      identityId: "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const platform = form.watch("platform");

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

  const filteredAdAccounts = adAccounts.filter((account) => account.platform === platform);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const parsed = publisherFormSchema.safeParse(values);
        if (!parsed.success) {
          parsed.error.issues.forEach((issue) => {
            const path = issue.path[0];
            if (typeof path === "string") {
              form.setError(path as keyof PublisherFormValues, { message: issue.message });
            }
          });
          return;
        }
        await onSubmit(parsed.data);
      })}
    >
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Publish Request</h2>
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
                {campaign.name} ({campaign.status})
              </option>
            ))}
          </select>
          {form.formState.errors.campaignId?.message ? (
            <p className="text-xs text-red-400">{form.formState.errors.campaignId.message}</p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="platform">
              Platform
            </label>
            <select
              id="platform"
              className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
              {...form.register("platform")}
            >
              {platforms?.registered.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
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
              {filteredAdAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName}
                </option>
              ))}
            </select>
            {form.formState.errors.adAccountId?.message ? (
              <p className="text-xs text-red-400">{form.formState.errors.adAccountId.message}</p>
            ) : null}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register("dryRun")} />
          Dry run (no platform mutations)
        </label>

        {platform === "META" ? (
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="pageId">
              Meta Page ID (optional, required by backend for live publish if missing in ad account metadata)
            </label>
            <input
              id="pageId"
              className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
              {...form.register("pageId")}
            />
          </div>
        ) : null}

        {platform === "TIKTOK" ? (
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="identityId">
              TikTok Identity ID (optional, required by backend for live publish if missing in ad account metadata)
            </label>
            <input
              id="identityId"
              className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
              {...form.register("identityId")}
            />
          </div>
        ) : null}
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
          {loading ? "Processing..." : "Continue"}
        </Button>
      </FormActions>
    </form>
  );
}
