"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef, type SortingState } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useDeleteCampaignMutation } from "@/features/campaigns/hooks/use-campaigns";
import { usePermission } from "@/hooks/use-permission";
import type { Campaign } from "@/types/campaign";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";

interface CampaignsTableProps {
  data: Campaign[];
  page: number;
  limit: number;
  total: number;
  loading: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onPageChange: (page: number) => void;
  /** True when no filters are applied beyond the default draft history view. */
  showGenerateCta?: boolean;
}

function SortHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onChange,
}: {
  label: string;
  field: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
}) {
  const active = sortBy === field;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() => onChange(field, active && sortOrder === "asc" ? "desc" : "asc")}
    >
      {label}
      <span className="text-xs text-muted-foreground">{active ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

export function CampaignsTable({
  data,
  page,
  limit,
  total,
  loading,
  sortBy,
  sortOrder,
  onSortChange,
  onPageChange,
  showGenerateCta = true,
}: CampaignsTableProps) {
  const router = useRouter();
  const canDelete = usePermission("delete");
  const deleteMutation = useDeleteCampaignMutation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Draft deleted.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete draft."));
    }
  };

  const columns = useMemo<ColumnDef<Campaign>[]>(
    () => [
      {
        accessorKey: "name",
        header: () => (
          <SortHeader
            label="Campaign"
            field="name"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={onSortChange}
          />
        ),
      },
      {
        id: "campaignType",
        header: "Type",
        cell: ({ row }) => row.original.campaignType ?? "—",
      },
      {
        id: "product",
        header: "Product",
        cell: ({ row }) => row.original.product?.title ?? "—",
      },
      {
        id: "store",
        header: "Store",
        cell: ({ row }) => row.original.store?.name ?? "—",
      },
      {
        accessorKey: "status",
        header: () => (
          <SortHeader
            label="Status"
            field="status"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={onSortChange}
          />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: () => (
          <SortHeader
            label="Created"
            field="createdAt"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={onSortChange}
          />
        ),
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: "updatedAt",
        header: () => (
          <SortHeader
            label="Updated"
            field="updatedAt"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={onSortChange}
          />
        ),
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const campaign = row.original;
          return (
            <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => router.push(ROUTES.CAMPAIGN_DETAILS(campaign.id))}
              >
                Open
              </Button>
              {campaign.aiSessionId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => router.push(ROUTES.AI_SESSION_DETAILS(campaign.aiSessionId!))}
                >
                  Continue Editing
                </Button>
              ) : null}
              {canDelete ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => setDeleteTarget(campaign)}>
                  Delete
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canDelete, onSortChange, router, sortBy, sortOrder],
  );

  if (!loading && data.length === 0) {
    return (
      <PageEmpty
        title="No draft campaigns yet"
        description="Generate your first AI campaign from a product to see it here."
        action={
          showGenerateCta ? (
            <Link href={ROUTES.PRODUCTS}>
              <Button type="button">Generate your first AI campaign</Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={(row) => router.push(ROUTES.CAMPAIGN_DETAILS(row.id))}
        getRowId={(row) => row.id}
        sorting={sorting}
        onSortingChange={setSorting}
      />
      <DataTablePagination page={page} limit={limit} total={total} onPageChange={onPageChange} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete draft campaign?"
        description="This removes the Campaign, Ad Set, Ad, and Creative draft entities. The linked AI Session and its generated campaign JSON are kept so you can review or save again later."
        confirmLabel="Delete draft"
        confirming={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
