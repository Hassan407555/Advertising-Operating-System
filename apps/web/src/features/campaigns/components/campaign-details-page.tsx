"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/states/page-loading";
import { StatusBadge } from "@/components/shared/status-badge";
import { CampaignForm } from "@/features/campaigns/components/campaign-form";
import {
  useAdAccountsQuery,
  useCampaignDetailsQuery,
  useDeleteCampaignMutation,
  useUpdateCampaignMutation,
} from "@/features/campaigns/hooks/use-campaigns";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";
import type { CreateCampaignFormValues } from "@/features/campaigns/schemas/campaign.schemas";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

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

export function CampaignDetailsPage({ id }: CampaignDetailsPageProps) {
  const router = useRouter();
  const canView = usePermission("view");
  const canEdit = usePermission("edit");
  const canDelete = usePermission("delete");
  const detailsQuery = useCampaignDetailsQuery(id);
  const adAccountsQuery = useAdAccountsQuery();
  const updateMutation = useUpdateCampaignMutation(id);
  const deleteMutation = useDeleteCampaignMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const campaign = detailsQuery.data;
  const isAiDraft = campaign?.source === "ai-session" || Boolean(campaign?.aiSessionId);

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

  if (!canView) {
    return (
      <RequireActiveStore>
        <PageEmpty title="Access restricted" description="Your role cannot view campaign details." />
      </RequireActiveStore>
    );
  }

  if (detailsQuery.isLoading) {
    return (
      <RequireActiveStore>
        <PageLoading cards={2} />
      </RequireActiveStore>
    );
  }

  if (detailsQuery.isError || !campaign) {
    return (
      <RequireActiveStore>
        <PageError
          title="Unable to load campaign"
          message={getErrorMessage(detailsQuery.error, "Campaign not found.")}
          onRetry={() => detailsQuery.refetch()}
        />
      </RequireActiveStore>
    );
  }

  return (
    <RequireActiveStore>
    <div className="space-y-4">
      <PageHeader
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
            {canDelete ? (
              <Button type="button" variant="secondary" onClick={() => setConfirmDelete(true)}>
                Delete Draft
              </Button>
            ) : null}
          </>
        }
      />

      {editOpen && canEdit ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Edit Draft</h2>
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

      <Card>
        <h2 className="text-lg font-semibold">General Information</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
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
        <Card>
          <h2 className="text-lg font-semibold">AI Session</h2>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
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
          <p className="mt-3 text-sm text-muted-foreground">
            Open the AI session for interview answers or the generated campaign review form. This draft
            remains the primary saved record.
          </p>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold">Metadata</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
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
    </div>
    </RequireActiveStore>
  );
}
