"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { ROUTES } from "@/constants/routes";
import type { AnalyticsSnapshot, AnalyticsSortField } from "@/features/analytics/types/analytics.types";
import { formatDateTime } from "@/utils/formatters";

interface AnalyticsSnapshotsTableProps {
  data: AnalyticsSnapshot[];
  loading: boolean;
  page: number;
  limit: number;
  total: number;
  sortBy: AnalyticsSortField;
  sortOrder: "asc" | "desc";
  onPageChange: (nextPage: number) => void;
  onSortChange: (sortBy: AnalyticsSortField, sortOrder: "asc" | "desc") => void;
}

export function AnalyticsSnapshotsTable({
  data,
  loading,
  page,
  limit,
  total,
  sortBy,
  sortOrder,
  onPageChange,
  onSortChange,
}: AnalyticsSnapshotsTableProps) {
  const router = useRouter();

  const columns = useMemo<ColumnDef<AnalyticsSnapshot>[]>(
    () => [
      { accessorKey: "snapshotDate", header: "Snapshot Date", cell: ({ row }) => formatDateTime(row.original.snapshotDate, "yyyy-MM-dd") },
      { accessorKey: "platform", header: "Platform" },
      { accessorKey: "level", header: "Level" },
      { accessorKey: "campaignName", header: "Campaign" },
      { accessorKey: "adSetName", header: "Ad Set" },
      { accessorKey: "adName", header: "Ad" },
      { accessorKey: "spend", header: "Spend" },
      { accessorKey: "revenue", header: "Revenue" },
      { accessorKey: "roas", header: "ROAS" },
      { accessorKey: "impressions", header: "Impressions" },
      { accessorKey: "clicks", header: "Clicks" },
      { accessorKey: "ctr", header: "CTR" },
      { accessorKey: "conversions", header: "Conversions" },
    ],
    [],
  );

  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];

  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No analytics snapshots found."
        sorting={sorting}
        onSortingChange={(nextSorting) => {
          const value = typeof nextSorting === "function" ? nextSorting(sorting) : nextSorting;
          const next = value[0];
          if (!next?.id) {
            return;
          }
          onSortChange(next.id as AnalyticsSortField, next.desc ? "desc" : "asc");
        }}
        onRowClick={(row) => router.push(ROUTES.ANALYTICS_DETAILS(row.id))}
      />
      <DataTablePagination page={page} limit={limit} total={total} onPageChange={onPageChange} />
    </div>
  );
}
