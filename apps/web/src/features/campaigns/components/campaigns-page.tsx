"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CampaignForm } from "@/features/campaigns/components/campaign-form";
import { CampaignsTable } from "@/features/campaigns/components/campaigns-table";
import { RequireActiveStore } from "@/components/shared/stores/require-active-store";
import { CAMPAIGN_STATUS_OPTIONS } from "@/features/campaigns/constants/campaign-options";
import { useCampaignListState } from "@/features/campaigns/hooks/use-campaign-list-state";
import {
  useAdAccountsQuery,
  useCampaignsQuery,
  useCreateCampaignMutation,
} from "@/features/campaigns/hooks/use-campaigns";
import { useStoresQuery } from "@/features/stores/hooks/use-stores";
import { useActiveStore } from "@/features/stores/hooks/use-active-store";
import { usePermission } from "@/hooks/use-permission";
import { AppError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/utils/errors";
import type { CreateCampaignFormValues } from "@/features/campaigns/schemas/campaign.schemas";
import type { AiCampaignType, CampaignListQuery } from "@/types/campaign";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CAMPAIGN_TYPE_OPTIONS: AiCampaignType[] = ["IMAGE", "CAROUSEL", "VIDEO", "NONE"];

const SORT_PRESETS: Array<{
  label: string;
  sortBy: NonNullable<CampaignListQuery["sortBy"]>;
  sortOrder: NonNullable<CampaignListQuery["sortOrder"]>;
}> = [
  { label: "Newest", sortBy: "createdAt", sortOrder: "desc" },
  { label: "Oldest", sortBy: "createdAt", sortOrder: "asc" },
  { label: "Recently Updated", sortBy: "updatedAt", sortOrder: "desc" },
];

const selectClassName = cn(
  "h-9 w-full rounded-[var(--radius-md)] border border-border/60 bg-input/40 px-3 text-sm",
  "shadow-[var(--shadow-xs)] outline-none transition-surface",
  "focus-visible:border-primary/50 focus-visible:shadow-[var(--shadow-focus)]",
);

function toIsoDateTime(value?: string) {
  if (!value) {
    return undefined;
  }
  return new Date(value).toISOString();
}

const storeGateProps = {
  emptyTitle: "No campaigns",
  emptyDescription: "Connect a store under Commerce, then generate a campaign from Products.",
} as const;

export function CampaignsPageContent() {
  const router = useRouter();
  const { query, patchQuery } = useCampaignListState();
  const { activeStore } = useActiveStore();
  const activeStoreId = activeStore?.id;
  const storeFilterValue = query.storeId ?? activeStoreId ?? "all";
  const effectiveStoreId = storeFilterValue === "all" ? undefined : storeFilterValue;
  const listQuery = useCampaignsQuery({
    ...query,
    storeId: effectiveStoreId,
  });
  const storesQuery = useStoresQuery();
  const adAccountsQuery = useAdAccountsQuery();
  const createMutation = useCreateCampaignMutation();
  const canCreate = usePermission("create");
  const canView = usePermission("view");
  const [createOpen, setCreateOpen] = useState(false);

  const activeSortPreset = useMemo(() => {
    return (
      SORT_PRESETS.find(
        (preset) => preset.sortBy === query.sortBy && preset.sortOrder === query.sortOrder,
      )?.label ?? "Custom"
    );
  }, [query.sortBy, query.sortOrder]);

  const hasExtraFilters = Boolean(
    query.search ||
      (query.status && query.status !== "DRAFT") ||
      (query.storeId && query.storeId !== "all" && query.storeId !== activeStoreId) ||
      query.campaignType,
  );

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
      <RequireActiveStore {...storeGateProps}>
        <PageEmpty title="Access restricted" description="Your role cannot view campaign history." />
      </RequireActiveStore>
    );
  }

  return (
    <RequireActiveStore {...storeGateProps}>
      <div className="page-stack animate-fade-in-up">
        <PageHeader
          eyebrow="AI Studio"
          title="Campaigns"
          description="Saved drafts and previous AI-generated Meta campaigns. Open a draft to review or edit."
          actions={
            canCreate ? (
              <Button type="button" variant="secondary" onClick={() => setCreateOpen((value) => !value)}>
                {createOpen ? "Close Form" : "Create Manual Campaign"}
              </Button>
            ) : null
          }
        />

        <Card className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <label className="sr-only" htmlFor="campaign-search">
              Search campaigns
            </label>
            <Input
              id="campaign-search"
              placeholder="Search by campaign name"
              value={query.search ?? ""}
              onChange={(event) => patchQuery({ search: event.target.value, page: 1 })}
            />
            <label className="sr-only" htmlFor="campaign-store-filter">
              Filter by store
            </label>
            <select
              id="campaign-store-filter"
              className={selectClassName}
              value={storeFilterValue}
              onChange={(event) =>
                patchQuery({
                  storeId: event.target.value === "all" ? "all" : event.target.value || undefined,
                  page: 1,
                })
              }
            >
              <option value="all">All stores</option>
              {(storesQuery.data ?? []).map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="campaign-type-filter">
              Filter by type
            </label>
            <select
              id="campaign-type-filter"
              className={selectClassName}
              value={query.campaignType ?? ""}
              onChange={(event) =>
                patchQuery({
                  campaignType: (event.target.value || undefined) as CampaignListQuery["campaignType"],
                  page: 1,
                })
              }
            >
              <option value="">All types</option>
              {CAMPAIGN_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="campaign-status-filter">
              Filter by status
            </label>
            <select
              id="campaign-status-filter"
              className={selectClassName}
              value={query.status ?? "DRAFT"}
              onChange={(event) =>
                patchQuery({
                  status: (event.target.value || undefined) as CampaignListQuery["status"],
                  page: 1,
                })
              }
            >
              {CAMPAIGN_STATUS_OPTIONS.filter((status) => status !== "DELETED").map((status) => (
                <option key={status} value={status}>
                  {status === "DRAFT" ? "Draft" : status.charAt(0) + status.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="campaign-sort">
              Sort campaigns
            </label>
            <select
              id="campaign-sort"
              className={selectClassName}
              value={activeSortPreset}
              onChange={(event) => {
                const preset = SORT_PRESETS.find((item) => item.label === event.target.value);
                if (!preset) {
                  return;
                }
                patchQuery({
                  sortBy: preset.sortBy,
                  sortOrder: preset.sortOrder,
                  page: 1,
                });
              }}
            >
              {SORT_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.label}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                patchQuery({
                  search: undefined,
                  status: "DRAFT",
                  storeId: undefined,
                  campaignType: undefined,
                  sortBy: "createdAt",
                  sortOrder: "desc",
                  page: 1,
                })
              }
            >
              Reset Filters
            </Button>
          </div>
        </Card>

        {createOpen && canCreate ? (
          <Card className="space-y-3">
            <SectionHeader title="Create Campaign" />
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
          page={listQuery.data?.meta?.page ?? query.page}
          limit={listQuery.data?.meta?.limit ?? query.limit}
          total={listQuery.data?.meta?.total ?? 0}
          loading={listQuery.isLoading}
          sortBy={query.sortBy ?? "createdAt"}
          sortOrder={query.sortOrder ?? "desc"}
          onSortChange={(sortBy, sortOrder) =>
            patchQuery({ sortBy: sortBy as typeof query.sortBy, sortOrder, page: 1 })
          }
          onPageChange={(page) => patchQuery({ page })}
          showGenerateCta={!hasExtraFilters}
        />
        {listQuery.isError ? (
          <PageError
            title={
              listQuery.error instanceof AppError && listQuery.error.statusCode === 403
                ? "Access restricted"
                : "Unable to load campaign history"
            }
            message={getErrorMessage(listQuery.error, "Campaign history could not be loaded.")}
            onRetry={() => listQuery.refetch()}
          />
        ) : null}
      </div>
    </RequireActiveStore>
  );
}
