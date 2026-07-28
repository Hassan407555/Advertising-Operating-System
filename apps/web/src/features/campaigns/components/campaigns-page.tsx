"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CampaignForm } from "@/features/campaigns/components/campaign-form";
import { CampaignsTable } from "@/features/campaigns/components/campaigns-table";
import {
  CAMPAIGN_OBJECTIVE_OPTIONS,
  CAMPAIGN_STATUS_OPTIONS,
  PLATFORM_OPTIONS,
} from "@/features/campaigns/constants/campaign-options";
import { useCampaignListState } from "@/features/campaigns/hooks/use-campaign-list-state";
import { useAdAccountsQuery, useCampaignsQuery, useCreateCampaignMutation } from "@/features/campaigns/hooks/use-campaigns";
import { usePermission } from "@/hooks/use-permission";
import { AppError } from "@/lib/api/errors";
import { getErrorMessage } from "@/utils/errors";
import type { CreateCampaignFormValues } from "@/features/campaigns/schemas/campaign.schemas";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function toIsoDateTime(value?: string) {
  if (!value) {
    return undefined;
  }
  return new Date(value).toISOString();
}

export function CampaignsPageContent() {
  const router = useRouter();
  const { query, patchQuery } = useCampaignListState();
  const listQuery = useCampaignsQuery(query);
  const adAccountsQuery = useAdAccountsQuery();
  const createMutation = useCreateCampaignMutation();
  const canCreate = usePermission("create");
  const canView = usePermission("view");
  const [createOpen, setCreateOpen] = useState(false);

  const handleCreate = async (values: CreateCampaignFormValues) => {
    try {
      const campaign = await createMutation.mutateAsync({
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
      });

      toast.success("Campaign created.");
      setCreateOpen(false);
      patchQuery({});
      router.push(`/campaigns/${campaign.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create campaign."));
    }
  };

  if (!canView) {
    return (
      <Card>
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your role cannot view campaigns.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Manage campaigns for the active organization.</p>
        </div>
        {canCreate ? (
          <Button type="button" onClick={() => setCreateOpen((value) => !value)}>
            {createOpen ? "Close Form" : "Create Campaign"}
          </Button>
        ) : null}
      </div>

      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input
            className="h-9 rounded-md border border-border bg-transparent px-3 text-sm"
            placeholder="Search name, slug, external ID"
            value={query.search ?? ""}
            onChange={(event) => patchQuery({ search: event.target.value, page: 1 })}
          />
          <select
            className="h-9 rounded-md border border-border bg-transparent px-3 text-sm"
            value={query.status ?? ""}
            onChange={(event) => patchQuery({ status: (event.target.value || undefined) as typeof query.status, page: 1 })}
          >
            <option value="">All statuses</option>
            {CAMPAIGN_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-transparent px-3 text-sm"
            value={query.objective ?? ""}
            onChange={(event) =>
              patchQuery({ objective: (event.target.value || undefined) as typeof query.objective, page: 1 })
            }
          >
            <option value="">All objectives</option>
            {CAMPAIGN_OBJECTIVE_OPTIONS.map((objective) => (
              <option key={objective} value={objective}>
                {objective}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-transparent px-3 text-sm"
            value={query.platform ?? ""}
            onChange={(event) => patchQuery({ platform: (event.target.value || undefined) as typeof query.platform, page: 1 })}
          >
            <option value="">All platforms</option>
            {PLATFORM_OPTIONS.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          <Button type="button" variant="secondary" onClick={() => patchQuery({ search: "", status: undefined, objective: undefined, platform: undefined, page: 1 })}>
            Reset Filters
          </Button>
        </div>
      </Card>

      {createOpen && canCreate ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Create Campaign</h2>
          <CampaignForm
            adAccounts={adAccountsQuery.data ?? []}
            mode="create"
            loading={createMutation.isPending}
            serverError={createMutation.isError ? getErrorMessage(createMutation.error) : undefined}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
          />
        </Card>
      ) : null}

      <CampaignsTable
        data={listQuery.data?.data ?? []}
        page={listQuery.data?.meta.page ?? query.page}
        limit={listQuery.data?.meta.limit ?? query.limit}
        total={listQuery.data?.meta.total ?? 0}
        loading={listQuery.isLoading}
        sortBy={query.sortBy ?? "createdAt"}
        sortOrder={query.sortOrder ?? "desc"}
        onSortChange={(sortBy, sortOrder) =>
          patchQuery({ sortBy: sortBy as typeof query.sortBy, sortOrder, page: 1 })
        }
        onPageChange={(page) => patchQuery({ page })}
      />
      {listQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">
            {(listQuery.error instanceof AppError && listQuery.error.statusCode === 403) ? "Forbidden" : "Failed to load campaigns"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(listQuery.error)}</p>
          <Button className="mt-3" type="button" onClick={() => listQuery.refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
