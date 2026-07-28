"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
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
  return new Date(value).toISOString();
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
      toast.success("Campaign updated.");
      setEditOpen(false);
      detailsQuery.refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update campaign."));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Campaign deleted.");
      setConfirmDelete(false);
      router.push(ROUTES.CAMPAIGNS);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete campaign."));
    }
  };

  if (!canView) {
    return (
      <Card>
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your role cannot view campaign details.</p>
      </Card>
    );
  }

  if (detailsQuery.isLoading) {
    return <Card className="h-64 animate-pulse bg-muted/30" />;
  }

  if (detailsQuery.isError || !campaign) {
    return (
      <Card>
        <h1 className="text-xl font-semibold">Unable to load campaign</h1>
        <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(detailsQuery.error, "Campaign not found.")}</p>
        <Button type="button" className="mt-3" onClick={() => detailsQuery.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">Campaign details and lifecycle controls.</p>
        </div>
        <div className="flex gap-2">
          <Link href={ROUTES.CAMPAIGNS}>
            <Button type="button" variant="secondary">
              Back to list
            </Button>
          </Link>
          {canEdit ? (
            <Button type="button" onClick={() => setEditOpen((value) => !value)}>
              {editOpen ? "Close Edit" : "Edit Campaign"}
            </Button>
          ) : null}
          {canDelete ? (
            <Button type="button" variant="secondary" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {editOpen && canEdit ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Edit Campaign</h2>
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
          <p><span className="text-muted-foreground">Name:</span> {campaign.name}</p>
          <p><span className="text-muted-foreground">Slug:</span> {campaign.slug ?? "N/A"}</p>
          <p><span className="text-muted-foreground">Status:</span> {campaign.status}</p>
          <p><span className="text-muted-foreground">External Status:</span> {campaign.externalStatus ?? "N/A"}</p>
          <p><span className="text-muted-foreground">Platform:</span> {campaign.adAccount?.platform ?? "N/A"}</p>
          <p><span className="text-muted-foreground">Objective:</span> {campaign.objective}</p>
          <p><span className="text-muted-foreground">Buying Type:</span> {campaign.buyingType}</p>
          <p><span className="text-muted-foreground">Currency:</span> {campaign.currency}</p>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Metadata & Audit</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <p><span className="text-muted-foreground">Campaign ID:</span> {campaign.id}</p>
          <p><span className="text-muted-foreground">External ID:</span> {campaign.externalId}</p>
          <p><span className="text-muted-foreground">Version:</span> {campaign.version}</p>
          <p><span className="text-muted-foreground">Created:</span> {formatDateTime(campaign.createdAt)}</p>
          <p><span className="text-muted-foreground">Updated:</span> {formatDateTime(campaign.updatedAt)}</p>
          <p><span className="text-muted-foreground">Archived At:</span> {campaign.archivedAt ? formatDateTime(campaign.archivedAt) : "N/A"}</p>
          <p><span className="text-muted-foreground">Start Date:</span> {campaign.startDate ? formatDateTime(campaign.startDate) : "N/A"}</p>
          <p><span className="text-muted-foreground">End Date:</span> {campaign.endDate ? formatDateTime(campaign.endDate) : "N/A"}</p>
          <p><span className="text-muted-foreground">Organization:</span> {campaign.organization?.name ?? campaign.organizationId}</p>
          <p><span className="text-muted-foreground">Ad Account:</span> {campaign.adAccount?.accountName ?? campaign.adAccountId}</p>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete campaign?"
        description="This action performs a backend soft delete and cannot be undone from this screen."
        confirmLabel="Delete"
        confirming={deleteMutation.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
