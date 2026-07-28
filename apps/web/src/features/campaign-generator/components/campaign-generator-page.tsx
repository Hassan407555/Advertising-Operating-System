"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { Card } from "@/components/ui/card";
import { useGenerateCampaignMutation, useGeneratorAdAccountsQuery } from "@/features/campaign-generator/hooks/use-campaign-generator";
import { CampaignGeneratorForm } from "@/features/campaign-generator/components/campaign-generator-form";
import { GenerationSuccessSummary } from "@/features/campaign-generator/components/generation-success-summary";
import type { GeneratorFormValues } from "@/features/campaign-generator/schemas/campaign-generator.schemas";
import type { GenerateCampaignResponse } from "@/features/campaign-generator/types/campaign-generator.types";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage } from "@/utils/errors";
import { Button } from "@/components/ui/button";

function normalizeCountries(countriesText: string): string[] {
  return countriesText
    .split(",")
    .map((country) => country.trim().toUpperCase())
    .filter(Boolean);
}

export function CampaignGeneratorPageContent() {
  const canGenerate = usePermission("create");
  const adAccountsQuery = useGeneratorAdAccountsQuery();
  const generateMutation = useGenerateCampaignMutation();
  const [result, setResult] = useState<GenerateCampaignResponse | null>(null);

  const handleSubmit = async (values: GeneratorFormValues) => {
    try {
      const response = await generateMutation.mutateAsync({
        productId: values.productId.trim(),
        countries: normalizeCountries(values.countriesText),
        platforms: values.platforms,
        dailyBudget: values.dailyBudget,
        language: values.language.trim(),
        marketingGoal: values.marketingGoal,
        currency: values.currency,
        adAccountIds: {
          ...(values.adAccountMeta ? { META: values.adAccountMeta } : {}),
          ...(values.adAccountTiktok ? { TIKTOK: values.adAccountTiktok } : {}),
        },
        preferences: {
          ...(values.campaignNamePrefix ? { campaignNamePrefix: values.campaignNamePrefix } : {}),
          ...(values.callToAction ? { callToAction: values.callToAction } : {}),
          ...(values.creativeType ? { creativeType: values.creativeType } : {}),
        },
      });

      setResult(response);
      toast.success("Campaign generation complete.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Campaign generation failed."));
    }
  };

  if (!canGenerate) {
    return (
      <PageEmpty
        title="Access restricted"
        description="Your role does not allow campaign generation."
      />
    );
  }

  if (result) {
    return <GenerationSuccessSummary result={result} onGenerateAnother={() => setResult(null)} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Campaign Generator</h1>
        <p className="text-sm text-muted-foreground">
          Generate draft campaigns, ad sets, ads, and creative placeholders from a Shopify product.
        </p>
      </div>

      {adAccountsQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load ad accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(adAccountsQuery.error)}</p>
          <Button className="mt-3" type="button" onClick={() => adAccountsQuery.refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      <CampaignGeneratorForm
        adAccounts={adAccountsQuery.data ?? []}
        loading={generateMutation.isPending}
        serverError={generateMutation.isError ? getErrorMessage(generateMutation.error) : undefined}
        onSubmit={handleSubmit}
        onCancel={() => setResult(null)}
      />
    </div>
  );
}
