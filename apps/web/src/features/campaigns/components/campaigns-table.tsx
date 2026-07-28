"use client";

import { useMemo, useState } from "react";
import { type ColumnDef, type RowSelectionState, type SortingState } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import type { Campaign } from "@/types/campaign";
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
}: CampaignsTableProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  const selectedCount = Object.keys(selection).length;

  const columns = useMemo<ColumnDef<Campaign>[]>(
    () => [
      {
        id: "select",
        header: () => null,
        cell: ({ row }) => (
          <input
            aria-label={`Select campaign ${row.original.name}`}
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(event) => event.stopPropagation()}
          />
        ),
      },
      {
        accessorKey: "name",
        header: () => (
          <SortHeader
            label="Name"
            field="name"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={onSortChange}
          />
        ),
      },
      {
        id: "platform",
        header: "Platform",
        cell: ({ row }) => row.original.adAccount?.platform ?? "N/A",
      },
      {
        accessorKey: "objective",
        header: () => (
          <SortHeader
            label="Objective"
            field="objective"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={onSortChange}
          />
        ),
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
      },
      {
        id: "organization",
        header: "Organization",
        cell: ({ row }) => row.original.organization?.name ?? "N/A",
      },
      {
        id: "createdBy",
        header: "Created By",
        cell: () => "N/A",
      },
      {
        accessorKey: "createdAt",
        header: () => (
          <SortHeader
            label="Created Date"
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
            label="Updated Date"
            field="updatedAt"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={onSortChange}
          />
        ),
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
    ],
    [onSortChange, sortBy, sortOrder],
  );

  if (!loading && data.length === 0) {
    return <PageEmpty title="No campaigns found" description="Create a campaign to get started." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{selectedCount} selected</p>
        <Button type="button" variant="secondary" disabled>
          Bulk actions unavailable
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={(row) => router.push(ROUTES.CAMPAIGN_DETAILS(row.id))}
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        getRowId={(row) => row.id}
        sorting={sorting}
        onSortingChange={setSorting}
      />
      <DataTablePagination page={page} limit={limit} total={total} onPageChange={onPageChange} />
    </div>
  );
}
