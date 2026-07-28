"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { FormFieldText } from "@/components/shared/forms/form-field-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CALL_TO_ACTION_OPTIONS,
  CREATIVE_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  MARKETING_GOAL_OPTIONS,
  SUPPORTED_GENERATOR_PLATFORMS,
} from "@/features/campaign-generator/constants/campaign-generator-options";
import { generatorFormSchema, type GeneratorFormValues } from "@/features/campaign-generator/schemas/campaign-generator.schemas";
import type { AdAccount } from "@/types/ad-account";

interface CampaignGeneratorFormProps {
  adAccounts: AdAccount[];
  loading: boolean;
  serverError?: string;
  onSubmit: (values: GeneratorFormValues) => Promise<void>;
  onCancel: () => void;
}

export function CampaignGeneratorForm({
  adAccounts,
  loading,
  serverError,
  onSubmit,
  onCancel,
}: CampaignGeneratorFormProps) {
  const form = useForm<GeneratorFormValues>({
    defaultValues: {
      productId: "",
      countriesText: "US",
      platforms: ["META"],
      dailyBudget: 50,
      language: "en",
      marketingGoal: "SALES",
      adAccountMeta: "",
      adAccountTiktok: "",
      currency: "USD",
      campaignNamePrefix: "",
      callToAction: "SHOP_NOW",
      creativeType: "IMAGE",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const platforms = form.watch("platforms");

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

  const metaAccounts = adAccounts.filter((account) => account.platform === "META");
  const tiktokAccounts = adAccounts.filter((account) => account.platform === "TIKTOK");

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const parsed = generatorFormSchema.safeParse(values);
        if (!parsed.success) {
          parsed.error.issues.forEach((issue) => {
            const path = issue.path[0];
            if (typeof path === "string") {
              form.setError(path as keyof GeneratorFormValues, { message: issue.message });
            }
          });
          return;
        }

        await onSubmit(parsed.data);
      })}
    >
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Campaign Information</h2>
        <FormFieldText
          label="Shopify Product ID"
          name="productId"
          register={form.register}
          error={form.formState.errors.productId?.message}
          placeholder="Paste synced product ID"
        />
        <p className="text-xs text-muted-foreground">
          Product list endpoint is not available in backend; provide a valid synced Shopify product ID.
        </p>
        <FormFieldText
          label="Campaign Name Prefix (Optional)"
          name="campaignNamePrefix"
          register={form.register}
          error={form.formState.errors.campaignNamePrefix?.message}
          placeholder="Summer Launch"
        />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Targeting & Budget</h2>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="countriesText">
            Countries (comma separated)
          </label>
          <input
            id="countriesText"
            className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
            {...form.register("countriesText")}
          />
          {form.formState.errors.countriesText?.message ? (
            <p className="text-xs text-red-400">{form.formState.errors.countriesText.message}</p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormFieldText
            label="Daily Budget"
            name="dailyBudget"
            register={form.register}
            error={form.formState.errors.dailyBudget?.message}
            placeholder="50"
          />
          <FormFieldText
            label="Language"
            name="language"
            register={form.register}
            error={form.formState.errors.language?.message}
            placeholder="en"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="marketingGoal">
              Marketing Goal
            </label>
            <select
              id="marketingGoal"
              className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
              {...form.register("marketingGoal")}
            >
              {MARKETING_GOAL_OPTIONS.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="currency">
              Currency
            </label>
            <select
              id="currency"
              className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
              {...form.register("currency")}
            >
              {CURRENCY_OPTIONS.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Platform & Ad Accounts</h2>
        <div className="space-y-2">
          {SUPPORTED_GENERATOR_PLATFORMS.map((platform) => (
            <label key={platform} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={platforms.includes(platform)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...platforms, platform]
                    : platforms.filter((current) => current !== platform);
                  form.setValue("platforms", next, { shouldDirty: true, shouldValidate: true });
                }}
              />
              {platform}
            </label>
          ))}
          {form.formState.errors.platforms?.message ? (
            <p className="text-xs text-red-400">{form.formState.errors.platforms.message}</p>
          ) : null}
        </div>

        {platforms.includes("META") ? (
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="adAccountMeta">
              Meta Ad Account
            </label>
            <select
              id="adAccountMeta"
              className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
              {...form.register("adAccountMeta")}
            >
              <option value="">Select Meta account</option>
              {metaAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName}
                </option>
              ))}
            </select>
            {form.formState.errors.adAccountMeta?.message ? (
              <p className="text-xs text-red-400">{form.formState.errors.adAccountMeta.message}</p>
            ) : null}
          </div>
        ) : null}

        {platforms.includes("TIKTOK") ? (
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="adAccountTiktok">
              TikTok Ad Account
            </label>
            <select
              id="adAccountTiktok"
              className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
              {...form.register("adAccountTiktok")}
            >
              <option value="">Select TikTok account</option>
              {tiktokAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName}
                </option>
              ))}
            </select>
            {form.formState.errors.adAccountTiktok?.message ? (
              <p className="text-xs text-red-400">{form.formState.errors.adAccountTiktok.message}</p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Creative Preferences</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="callToAction">
              Call To Action
            </label>
            <select
              id="callToAction"
              className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
              {...form.register("callToAction")}
            >
              {CALL_TO_ACTION_OPTIONS.map((cta) => (
                <option key={cta} value={cta}>
                  {cta}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="creativeType">
              Creative Type
            </label>
            <select
              id="creativeType"
              className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
              {...form.register("creativeType")}
            >
              {CREATIVE_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
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
          {loading ? "Generating..." : "Generate Campaign"}
        </Button>
      </FormActions>
    </form>
  );
}
