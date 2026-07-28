"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/use-permission";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";
import { PublisherForm } from "@/features/publisher/components/publisher-form";
import { PublisherValidationResults } from "@/features/publisher/components/publisher-validation-results";
import { PublisherResultSummary } from "@/features/publisher/components/publisher-result-summary";
import {
  usePublishCampaignMutation,
  usePublisherAdAccountsQuery,
  usePublisherCampaignOptionsQuery,
  usePublisherPlatformsQuery,
  useValidatePublishMutation,
} from "@/features/publisher/hooks/use-publisher";
import type { PublisherFormValues } from "@/features/publisher/schemas/publisher.schemas";
import type { PublishCampaignPayload, PublishCampaignResponse, PublishValidationResponse } from "@/features/publisher/types/publisher.types";

function toPayload(values: PublisherFormValues, organizationId: string): PublishCampaignPayload {
  return {
    campaignId: values.campaignId,
    organizationId,
    platform: values.platform,
    adAccountId: values.adAccountId,
    options: {
      dryRun: values.dryRun,
      ...(values.pageId ? { pageId: values.pageId } : {}),
      ...(values.identityId ? { identityId: values.identityId } : {}),
    },
  };
}

export function PublisherPageContent() {
  const { organization } = useSession();
  const canValidate = usePermission("view");
  const canPublish = usePermission("publish");

  const platformsQuery = usePublisherPlatformsQuery();
  const campaignsQuery = usePublisherCampaignOptionsQuery();
  const adAccountsQuery = usePublisherAdAccountsQuery();
  const validateMutation = useValidatePublishMutation();
  const publishMutation = usePublishCampaignMutation();

  const [lastFormValues, setLastFormValues] = useState<PublisherFormValues | null>(null);
  const [validation, setValidation] = useState<PublishValidationResponse | null>(null);
  const [result, setResult] = useState<PublishCampaignResponse | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const serverError = useMemo(() => {
    if (validateMutation.isError) {
      return getErrorMessage(validateMutation.error);
    }
    if (publishMutation.isError) {
      return getErrorMessage(publishMutation.error);
    }
    return undefined;
  }, [publishMutation.error, publishMutation.isError, validateMutation.error, validateMutation.isError]);

  const runValidation = async (values: PublisherFormValues) => {
    if (!organization?.id) {
      toast.error("Active organization is required.");
      return;
    }

    try {
      const payload = toPayload(values, organization.id);
      const response = await validateMutation.mutateAsync(payload);
      setLastFormValues(values);
      setValidation(response);
      setResult(null);

      if (response.valid) {
        toast.success("Validation passed.");
      } else {
        toast.error("Validation failed. Review issues.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Validation failed."));
    }
  };

  const runPublish = async () => {
    if (!organization?.id || !lastFormValues) {
      toast.error("Missing publish context.");
      return;
    }

    try {
      setIsPublishing(true);
      const payload = toPayload(lastFormValues, organization.id);
      const response = await publishMutation.mutateAsync(payload);
      setResult(response);
      toast.success(`Publish finished with status: ${response.status}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Publish failed."));
    } finally {
      setIsPublishing(false);
    }
  };

  if (!canValidate) {
    return <PageEmpty title="Access restricted" description="Your role does not have access to publisher validation." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Publisher</h1>
        <p className="text-sm text-muted-foreground">Validate and publish campaign entities to supported platforms.</p>
      </div>

      {platformsQuery.isError || campaignsQuery.isError || adAccountsQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load publisher data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {getErrorMessage(platformsQuery.error ?? campaignsQuery.error ?? adAccountsQuery.error)}
          </p>
          <Button
            className="mt-3"
            type="button"
            onClick={() => {
              platformsQuery.refetch();
              campaignsQuery.refetch();
              adAccountsQuery.refetch();
            }}
          >
            Retry
          </Button>
        </Card>
      ) : null}

      <PublisherForm
        campaigns={campaignsQuery.data ?? []}
        adAccounts={adAccountsQuery.data ?? []}
        platforms={platformsQuery.data}
        loading={validateMutation.isPending || publishMutation.isPending}
        serverError={serverError}
        onSubmit={runValidation}
        onCancel={() => {
          setValidation(null);
          setResult(null);
        }}
      />

      {validation ? <PublisherValidationResults validation={validation} /> : null}

      {validation?.valid ? (
        <Card className="space-y-2">
          <h2 className="text-lg font-semibold">Publish Actions</h2>
          <p className="text-sm text-muted-foreground">
            Dry run and live publish use the same backend publish endpoint with `options.dryRun`.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={runPublish}
              disabled={!canPublish || isPublishing}
            >
              {isPublishing ? "Publishing..." : "Run Publish"}
            </Button>
            {!canPublish ? (
              <p className="self-center text-xs text-muted-foreground">Live publish is restricted for your role.</p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {result ? <PublisherResultSummary result={result} onRetry={runPublish} /> : null}
    </div>
  );
}
