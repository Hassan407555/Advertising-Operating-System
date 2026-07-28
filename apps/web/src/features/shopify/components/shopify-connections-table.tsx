"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table/data-table";
import { ROUTES } from "@/constants/routes";
import type { ShopifyConnection } from "@/features/shopify/types/shopify.types";
import { formatDateTime } from "@/utils/formatters";

interface ShopifyConnectionsTableProps {
  connection: ShopifyConnection | null;
  loading: boolean;
}

export function ShopifyConnectionsTable({ connection, loading }: ShopifyConnectionsTableProps) {
  const router = useRouter();
  const rows = connection ? [connection] : [];

  const columns = useMemo<ColumnDef<ShopifyConnection>[]>(
    () => [
      { accessorKey: "accountName", header: "Store Name" },
      { accessorKey: "shop", header: "Shop Domain" },
      { accessorKey: "status", header: "Connection Status" },
      { accessorKey: "syncStatus", header: "Sync Status" },
      {
        accessorKey: "lastSyncedAt",
        header: "Last Synced",
        cell: ({ row }) => (row.original.lastSyncedAt ? formatDateTime(row.original.lastSyncedAt) : "N/A"),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      loading={loading}
      emptyMessage="No Shopify connection found."
      onRowClick={() => router.push(ROUTES.SHOPIFY_DETAILS)}
    />
  );
}
