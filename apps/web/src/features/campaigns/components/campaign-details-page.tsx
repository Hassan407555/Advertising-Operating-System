"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/states/page-loading";
import { SectionHeader } from "@/components/shared/section-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { CampaignForm } from "@/features/campaigns/components/campaign-form";
import { CampaignWorkflowCoach } from "@/features/campaigns/components/campaign-workflow-coach";
import {
  useAdAccountsQuery,
  useCampaignDetailsQuery,
  useDeleteCampaignMutation,
  useUpdateCampaignMutation,
} from "@/features/campaigns/hooks/use-campaigns";
import { useAdvertisingConfigurationQuery } from "@/features/stores/hooks/use-advertising-configuration";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";
import { useMetaConnectionQuery } from "@/features/meta/hooks/use-meta";
import { usePublishCampaignMutation } from "@/features/publisher/hooks/use-publisher";
import { PublisherResultSummary } from "@/features/publisher/components/publisher-result-summary";
import {
  getPublishFailureToastMessage,
  type PublishCampaignResponse,
} from "@/features/publisher/types/publisher.types";
import { usePermission } from "@/hooks/use-permission";
import { buildAdvertisingSetupHref, buildCampaignChecklistReturnPath } from "@/lib/navigation/journey-return";
import { getErrorMessage, getPublishErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";
import type { CreateCampaignFormValues } from "@/features/campaigns/schemas/campaign.schemas";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useCampaignReadiness } from "@/features/campaign-readiness/hooks/use-campaign-readiness";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";

interface CampaignDetailsPageProps {
  id: string;
}

function toIsoDateTime(value?: string) {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value.");
  }
  return date.toISOString();
}

function toDateTimeLocal(value: string | null): string {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString().slice(0, 16);
}

const storeGateProps = {
  emptyTitle: "No campaigns",
  emptyDescription: "Connect a store under Commerce, then generate a campaign from Products.",
} as const;

export function CampaignDetailsPage({ id }: CampaignDetailsPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeStore, refreshStores } = useActiveStore();
  const canView = usePermission("view");
  const canEdit = usePermission("edit");
  const canDelete = usePermission("delete");
  const canPublish = usePermission("publish");
  const detailsQuery = useCampaignDetailsQuery(id);
  const adAccountsQuery = useAdAccountsQuery();
  const advertisingConfigQuery = useAdvertisingConfigurationQuery(activeStore?.id);
  const metaConnectionQuery = useMetaConnectionQuery(Boolean(activeStore?.id));
  const updateMutation = useUpdateCampaignMutation(id);
  const deleteMutation = useDeleteCampaignMutation();
  const publishMutation = usePublishCampaignMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [metaRequiredOpen, setMetaRequiredOpen] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishCampaignResponse | null>(null);

  const campaign = detailsQuery.data;
  const isAiDraft = campaign?.source === "ai-session" || Boolean(campaign?.aiSessionId);
  const readiness = useCampaignReadiness({
    store: activeStore,
    campaign,
    publishResult,
  });
  const isPublished = readiness.flags.live;

  const handleReturnedFromSetup = useCallback(async () => {
    await Promise.all([
      refreshStores(),
      detailsQuery.refetch(),
      advertisingConfigQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORES }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }),
    ]);
  }, [
    advertisingConfigQuery,
    detailsQuery,
    queryClient,
    refreshStores,
  ]);

  const defaultValues = useMemo(() => {
    if (!campaign) {
      return undefined;
    }

    return {
      adAccountId: campaign.adAccountId,
      name: campaign.name,
      slug: campaign.slug ?? "",
      objective: campaign.objective,
      buyingType: campaign.buyingType,
      currency: campaign.currency,
      dailyBudget: campaign.dailyBudget ? Number(campaign.dailyBudget) : undefined,
      lifetimeBudget: campaign.lifetimeBudget ? Number(campaign.lifetimeBudget) : undefined,
      startDate: toDateTimeLocal(campaign.startDate),
      endDate: toDateTimeLocal(campaign.endDate),
      isActive: campaign.isActive,
    };
  }, [campaign]);

  const advertisingSetupHref = buildAdvertisingSetupHref(buildCampaignChecklistReturnPath(id));
  const advertisingConfig = advertisingConfigQuery.data;
  const selectedAdAccount =
    (adAccountsQuery.data ?? []).find((account) => account.id === advertisingConfig?.adAccountId) ??
    (adAccountsQuery.data ?? []).find((account) => account.id === campaign?.adAccountId);
  const metaConnection = metaConnectionQuery.data;

  const handleSave = async (values: CreateCampaignFormValues) => {
    if (!campaign) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        adAccountId: values.adAccountId,
        name: values.name,
        slug: values.slug || undefined,
        objective: values.objective,
        buyingType: values.buyingType,
        currency: values.currency,
        dailyBudget: values.dailyBudget,
        lifetimeBudget: values.lifetimeBudget,
        startDate: toIsoDateTime(values.startDate),
        endDate: toIsoDateTime(values.endDate),
        isActive: values.isActive,
        version: campaign.version,
      });
      toast.success("Draft updated.");
      setEditOpen(false);
      detailsQuery.refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update draft."));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Draft deleted.");
      setConfirmDelete(false);
      router.push(ROUTES.CAMPAIGNS);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete draft."));
    }
  };

  const handlePublishToMeta = async () => {
    if (!campaign) {
      return;
    }

    // Publish must never run unless every checklist prerequisite is complete.
    if (!readiness.next.ready || !readiness.flags.readyToPublish) {
      if (readiness.next.actionUrl) {
        void router.push(readiness.next.actionUrl);
        return;
      }
      setMetaRequiredOpen(true);
      return;
    }

    const adAccountId =
      advertisingConfigQuery.data?.adAccountId || campaign.adAccountId;
    if (!adAccountId) {
      toast.error("Select a Meta ad account in Advertising Configuration before publishing.");
      if (readiness.next.actionUrl) {
        void router.push(readiness.next.actionUrl);
        return;
      }
      setMetaRequiredOpen(true);
      return;
    }

    try {
      const pageId = advertisingConfigQuery.data?.facebookPageId;
      const response = await publishMutation.mutateAsync({
        campaignId: campaign.id,
        organizationId: campaign.organizationId,
        platform: "META",
        adAccountId,
        options: {
          dryRun: false,
          ...(pageId ? { pageId } : {}),
        },
      });
      setPublishResult(response);
      await detailsQuery.refetch();

      if (response.success || response.status === "PUBLISHED" || response.externalCampaignId) {
        toast.success("Campaign published to Meta.");
      } else if (response.status === "PARTIAL") {
        toast.success("Publish finished with partial success. Review the result below.");
      } else {
        toast.error(getPublishFailureToastMessage(response));
      }
    } catch (error) {
      toast.error(
        getPublishErrorMessage(error, "Failed to publish campaign to Meta."),
      );
    }
  };

  if (!canView) {
    return (
      <RequireActiveStore {...storeGateProps}>
        <PageEmpty title="Access restricted" description="Your role cannot view campaign details." />
      </RequireActiveStore>
    );
  }

  if (detailsQuery.isLoading) {
    return (
      <RequireActiveStore {...storeGateProps}>
        <PageLoading cards={2} />
      </RequireActiveStore>
    );
  }

  if (detailsQuery.isError || !campaign) {
    return (
      <RequireActiveStore {...storeGateProps}>
        <PageError
          title="Unable to load campaign"
          message={getErrorMessage(detailsQuery.error, "Campaign not found.")}
          onRetry={() => detailsQuery.refetch()}
        />
      </RequireActiveStore>
    );
  }

  return (
    <RequireActiveStore {...storeGateProps}>
      <div className="page-stack animate-fade-in-up">
        <PageHeader
          eyebrow="AI Studio"
          title={campaign.name}
          description={isAiDraft ? "AI-generated draft campaign." : "Campaign details."}
          actions={
            <>
              <Link href={ROUTES.CAMPAIGNS}>
                <Button type="button" variant="secondary">
                  Back to Campaign History
                </Button>
              </Link>
              {campaign.aiSessionId ? (
                <Link href={ROUTES.AI_SESSION_DETAILS(campaign.aiSessionId)}>
                  <Button type="button" variant="secondary">
                    Continue Editing
                  </Button>
                </Link>
              ) : null}
              {canEdit ? (
                <Button type="button" onClick={() => setEditOpen((value) => !value)}>
                  {editOpen ? "Close Edit" : "Edit Draft"}
                </Button>
              ) : null}
              {canDelete && !isPublished ? (
                <Button type="button" variant="secondary" onClick={() => setConfirmDelete(true)}>
                  Delete Draft
                </Button>
              ) : null}
            </>
          }
        />

        <CampaignWorkflowCoach
          readiness={readiness}
          canPublish={canPublish}
          publishing={publishMutation.isPending}
          onPublish={() => void handlePublishToMeta()}
          onReturnedFromSetup={handleReturnedFromSetup}
        />

        <Card className="space-y-3">
          <SectionHeader
            title="Publishing Destinations"
            description="Meta destinations that will receive this campaign."
          />
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Meta account:</span>{" "}
              {metaConnection?.connected
                ? metaConnection.accountName || metaConnection.accountId
                : "Not connected"}
            </p>
            <p>
              <span className="text-muted-foreground">Ad Account:</span>{" "}
              {selectedAdAccount?.accountName ??
                advertisingConfig?.adAccountId ??
                campaign.adAccountId ??
                "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Facebook Page:</span>{" "}
              {advertisingConfig?.facebookPageId ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Pixel:</span>{" "}
              {advertisingConfig?.pixelId ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Instagram:</span>{" "}
              {advertisingConfig?.instagramAccountId ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Catalog:</span>{" "}
              {advertisingConfig?.catalogId ?? "—"}
            </p>
          </div>
          {!readiness.flags.metaAdvertisingConfigured ? (
            <Link href={advertisingSetupHref}>
              <Button type="button" variant="secondary">
                Complete Advertising Setup
              </Button>
            </Link>
          ) : null}
        </Card>

        <Card className="space-y-3">
          <SectionHeader
            title="Creative Preview"
            description="Product and budget context used when publishing to Meta."
          />
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Product:</span>{" "}
              {campaign.product?.title ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Objective:</span> {campaign.objective}
            </p>
            <p>
              <span className="text-muted-foreground">Daily budget:</span>{" "}
              {campaign.dailyBudget ?? "N/A"}
            </p>
            <p>
              <span className="text-muted-foreground">Lifetime budget:</span>{" "}
              {campaign.lifetimeBudget ?? "N/A"}
            </p>
            <p>
              <span className="text-muted-foreground">Buying type:</span> {campaign.buyingType}
            </p>
            <p>
              <span className="text-muted-foreground">Currency:</span> {campaign.currency}
            </p>
          </div>
        </Card>

        {publishResult ? (
          <PublisherResultSummary
            result={publishResult}
            onRetry={() => {
              setPublishResult(null);
              void handlePublishToMeta();
            }}
          />
        ) : null}

        {editOpen && canEdit ? (
          <Card className="space-y-3">
            <SectionHeader title="Edit Draft" />
            <CampaignForm
              adAccounts={adAccountsQuery.data ?? []}
              mode="edit"
              defaultValues={defaultValues}
              loading={updateMutation.isPending}
              serverError={updateMutation.isError ? getErrorMessage(updateMutation.error) : undefined}
              onSubmit={handleSave}
              onCancel={() => setEditOpen(false)}
            />
          </Card>
        ) : null}

        <Card className="space-y-3">
          <SectionHeader title="General Information" />
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Name:</span> {campaign.name}
            </p>
            <p className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>{" "}
              <StatusBadge status={campaign.status} />
            </p>
            <p>
              <span className="text-muted-foreground">Type:</span> {campaign.campaignType ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Product:</span> {campaign.product?.title ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Store:</span> {campaign.store?.name ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Objective:</span> {campaign.objective}
            </p>
            <p>
              <span className="text-muted-foreground">Buying Type:</span> {campaign.buyingType}
            </p>
            <p>
              <span className="text-muted-foreground">Currency:</span> {campaign.currency}
            </p>
            <p>
              <span className="text-muted-foreground">Daily Budget:</span>{" "}
              {campaign.dailyBudget ?? "N/A"}
            </p>
            <p>
              <span className="text-muted-foreground">Lifetime Budget:</span>{" "}
              {campaign.lifetimeBudget ?? "N/A"}
            </p>
          </div>
        </Card>

        {isAiDraft ? (
          <Card className="space-y-3">
            <SectionHeader title="AI Session" />
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Source:</span> AI generation
              </p>
              <p>
                <span className="text-muted-foreground">Session:</span>{" "}
                {campaign.aiSessionId ? (
                  <Link
                    className="underline underline-offset-2"
                    href={ROUTES.AI_SESSION_DETAILS(campaign.aiSessionId)}
                  >
                    Open interview & review
                  </Link>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Open the AI session for interview answers or the generated campaign review form. This draft
              remains the primary saved record.
            </p>
          </Card>
        ) : null}

        <Card className="space-y-3">
          <SectionHeader title="Metadata" />
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Campaign ID:</span> {campaign.id}
            </p>
            <p>
              <span className="text-muted-foreground">Created:</span>{" "}
              {formatDateTime(campaign.createdAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Updated:</span>{" "}
              {formatDateTime(campaign.updatedAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Organization:</span>{" "}
              {campaign.organization?.name ?? campaign.organizationId}
            </p>
            <p>
              <span className="text-muted-foreground">Ad Account:</span>{" "}
              {campaign.adAccount?.accountName ?? campaign.adAccountId}
            </p>
            <p>
              <span className="text-muted-foreground">Meta Campaign ID:</span>{" "}
              {campaign.externalId && !campaign.externalId.startsWith("pending:")
                ? campaign.externalId
                : publishResult?.externalCampaignId ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Published:</span>{" "}
              {publishResult?.completedAt
                ? formatDateTime(publishResult.completedAt)
                : isPublished
                  ? formatDateTime(campaign.updatedAt)
                  : "—"}
            </p>
            {(campaign.externalId && !campaign.externalId.startsWith("pending:")) ||
            publishResult?.externalCampaignId ? (
              <p>
                <span className="text-muted-foreground">Ads Manager:</span>{" "}
                <a
                  className="text-primary underline underline-offset-2"
                  href={`https://www.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${encodeURIComponent(
                    (publishResult?.externalCampaignId || campaign.externalId)!,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open campaign
                </a>
              </p>
            ) : null}
          </div>
        </Card>

        <ConfirmDialog
          open={confirmDelete}
          title="Delete draft campaign?"
          description="This removes the draft campaign. The linked AI session is kept so you can review or save again later."
          confirmLabel="Delete draft"
          confirming={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />

        <ConfirmDialog
          open={metaRequiredOpen}
          title="Meta Connection Required"
          description="You can generate unlimited AI campaigns without Meta. To publish this campaign into Meta Ads Manager, please complete your Advertising Configuration."
          confirmLabel="Configure Meta"
          cancelLabel="Cancel"
          onCancel={() => setMetaRequiredOpen(false)}
          onConfirm={() => {
            setMetaRequiredOpen(false);
            void router.push(advertisingSetupHref);
          }}
        />
      </div>
    </RequireActiveStore>
  );
}
