"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { AnalyticsBreakdownRow } from "@/features/analytics/types/analytics.types";

interface AnalyticsBreakdownTableProps {
  data: AnalyticsBreakdownRow[];
  loading: boolean;
}

export function AnalyticsBreakdownTable({ data, loading }: AnalyticsBreakdownTableProps) {
  const columns = useMemo<ColumnDef<AnalyticsBreakdownRow>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
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

  return <DataTable columns={columns} data={data} loading={loading} emptyMessage="No breakdown data available." />;
}
