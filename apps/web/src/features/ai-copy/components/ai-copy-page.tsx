"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { useSession } from "@/providers/session-provider";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage } from "@/utils/errors";
import { AiCopyForm } from "@/features/ai-copy/components/ai-copy-form";
import { AiCopyResults } from "@/features/ai-copy/components/ai-copy-results";
import { useAiCopyCampaignOptionsQuery, useGenerateAiCopyMutation } from "@/features/ai-copy/hooks/use-ai-copy";
import type { AiCopyGenerateFormValues } from "@/features/ai-copy/schemas/ai-copy.schemas";
import type { GenerateAiCopyResponse } from "@/features/ai-copy/types/ai-copy.types";

export function AiCopyPageContent() {
  const { organization } = useSession();
  const canGenerate = usePermission("create");
  const campaignsQuery = useAiCopyCampaignOptionsQuery();
  const mutation = useGenerateAiCopyMutation();
  const [result, setResult] = useState<GenerateAiCopyResponse | null>(null);

  const handleGenerate = async (values: AiCopyGenerateFormValues) => {
    if (!organization?.id) {
      toast.error("Active organization is required.");
      return;
    }

    try {
      const response = await mutation.mutateAsync({
        campaignId: values.campaignId,
        organizationId: organization.id,
      });
      setResult(response);
      toast.success("AI copy generation completed.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to generate AI copy."));
    }
  };

  if (!canGenerate) {
    return <PageEmpty title="Access restricted" description="Your role does not have access to AI Copy generation." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">AI Copy</h1>
        <p className="text-sm text-muted-foreground">
          Generate AI marketing copy for campaign creatives using the backend AI gateway.
        </p>
      </div>

      {campaignsQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load campaigns</h2>
          <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(campaignsQuery.error)}</p>
          <Button type="button" className="mt-3" onClick={() => campaignsQuery.refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {result ? (
        <AiCopyResults result={result} onRegenerate={() => setResult(null)} />
      ) : (
        <AiCopyForm
          campaigns={campaignsQuery.data ?? []}
          loading={mutation.isPending}
          serverError={mutation.isError ? getErrorMessage(mutation.error) : undefined}
          onSubmit={handleGenerate}
          onCancel={() => setResult(null)}
        />
      )}
    </div>
  );
}
