"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { FormFieldText } from "@/components/shared/forms/form-field-text";
import { Button } from "@/components/ui/button";
import { CAMPAIGN_BUYING_TYPE_OPTIONS, CAMPAIGN_OBJECTIVE_OPTIONS } from "@/features/campaigns/constants/campaign-options";
import { createCampaignSchema, type CreateCampaignFormValues } from "@/features/campaigns/schemas/campaign.schemas";
import type { AdAccount } from "@/types/ad-account";

interface CampaignFormProps {
  adAccounts: AdAccount[];
  defaultValues?: Partial<CreateCampaignFormValues>;
  onSubmit: (values: CreateCampaignFormValues) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  serverError?: string;
  mode: "create" | "edit";
}

export function CampaignForm({
  adAccounts,
  defaultValues,
  onSubmit,
  onCancel,
  loading = false,
  serverError,
  mode,
}: CampaignFormProps) {
  const form = useForm<CreateCampaignFormValues>({
    defaultValues: {
      adAccountId: defaultValues?.adAccountId ?? "",
      name: defaultValues?.name ?? "",
      slug: defaultValues?.slug ?? "",
      objective: defaultValues?.objective ?? "SALES",
      buyingType: defaultValues?.buyingType ?? "AUCTION",
      currency: defaultValues?.currency ?? "USD",
      dailyBudget: defaultValues?.dailyBudget,
      lifetimeBudget: defaultValues?.lifetimeBudget,
      startDate: defaultValues?.startDate ?? "",
      endDate: defaultValues?.endDate ?? "",
      isActive: defaultValues?.isActive ?? true,
    },
  });

  const hasChanges = form.formState.isDirty;
  const submitLabel = mode === "create" ? "Create Campaign" : "Save Changes";

  useEffect(() => {
    if (mode !== "edit") {
      return;
    }

    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [form.formState.isDirty, mode]);

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        const parsed = createCampaignSchema.safeParse(values);

        if (!parsed.success) {
          parsed.error.issues.forEach((issue) => {
            const path = issue.path[0];
            if (typeof path === "string") {
              form.setError(path as keyof CreateCampaignFormValues, {
                message: issue.message,
              });
            }
          });
          return;
        }

        await onSubmit(parsed.data);
      })}
    >
      <FormFieldText
        label="Name"
        name="name"
        register={form.register}
        error={form.formState.errors.name?.message}
        placeholder="Campaign name"
      />

      <FormFieldText
        label="Slug (Optional)"
        name="slug"
        register={form.register}
        error={form.formState.errors.slug?.message}
        placeholder="campaign-slug"
      />

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="adAccountId">
          Ad Account
        </label>
        <select
          id="adAccountId"
          className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm"
          {...form.register("adAccountId")}
        >
          <option value="">Select an ad account</option>
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="objective">
            Objective
          </label>
          <select
            id="objective"
            className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm"
            {...form.register("objective")}
          >
            {CAMPAIGN_OBJECTIVE_OPTIONS.map((objective) => (
              <option key={objective} value={objective}>
                {objective}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="buyingType">
            Buying Type
          </label>
          <select
            id="buyingType"
            className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm"
            {...form.register("buyingType")}
          >
            {CAMPAIGN_BUYING_TYPE_OPTIONS.map((buyingType) => (
              <option key={buyingType} value={buyingType}>
                {buyingType}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormFieldText
          label="Daily Budget"
          name="dailyBudget"
          register={form.register}
          error={form.formState.errors.dailyBudget?.message}
          placeholder="0.00"
        />
        <FormFieldText
          label="Lifetime Budget"
          name="lifetimeBudget"
          register={form.register}
          error={form.formState.errors.lifetimeBudget?.message}
          placeholder="0.00"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="startDate">
            Start Date
          </label>
          <input
            id="startDate"
            type="datetime-local"
            className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm"
            {...form.register("startDate")}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="endDate">
            End Date
          </label>
          <input
            id="endDate"
            type="datetime-local"
            className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm"
            {...form.register("endDate")}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("isActive")} />
        Active campaign
      </label>

      <FormErrorBanner message={serverError} />

      <FormActions>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        {mode === "edit" ? (
          <Button type="button" variant="secondary" onClick={() => form.reset()}>
            Reset
          </Button>
        ) : null}
        <Button type="submit" disabled={loading || (mode === "edit" && !hasChanges)}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </FormActions>
    </form>
  );
}
