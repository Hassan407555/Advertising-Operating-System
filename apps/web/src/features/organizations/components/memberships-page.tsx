"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { DataTable } from "@/components/shared/data-table/data-table";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MEMBERSHIP_ROLE_OPTIONS } from "@/features/organizations/constants/organization.constants";
import { useMembershipsQuery, useRemoveMembershipMutation, useUpdateMembershipRoleMutation } from "@/features/organizations/hooks/use-organizations";
import type { Membership } from "@/features/organizations/types/organization.types";
import { usePermission } from "@/hooks/use-permission";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";

export function MembershipsPageContent() {
  const canView = usePermission("view");
  const { membership } = useSession();
  // Backend limits membership role updates/removals to OWNER.
  const canManageMemberships = membership?.role === "OWNER";
  const membershipsQuery = useMembershipsQuery();
  const updateRoleMutation = useUpdateMembershipRoleMutation();
  const removeMembershipMutation = useRemoveMembershipMutation();
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({});
  const [confirmingMembershipId, setConfirmingMembershipId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<Membership>[]>(
    () => [
      {
        accessorKey: "user",
        header: "User",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">
              {row.original.user.firstName} {row.original.user.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.user.email}</p>
          </div>
        ),
      },
      { accessorKey: "user.status", header: "User Status" },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <select
              className="h-8 rounded-md border border-border bg-transparent px-2 text-sm"
              aria-label={`Role for ${row.original.user.email}`}
              value={draftRoles[row.original.id] ?? row.original.role}
              onChange={(event) => setDraftRoles((prev) => ({ ...prev, [row.original.id]: event.target.value }))}
              disabled={!canManageMemberships}
            >
              {MEMBERSHIP_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              disabled={!canManageMemberships || updateRoleMutation.isPending}
              onClick={async () => {
                try {
                  await updateRoleMutation.mutateAsync({
                    membershipId: row.original.id,
                    role: (draftRoles[row.original.id] ?? row.original.role) as
                      | "OWNER"
                      | "ADMIN"
                      | "MEMBER"
                      | "VIEWER",
                  });
                  toast.success("Membership role updated.");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Failed to update membership role."));
                }
              }}
            >
              Save
            </Button>
          </div>
        ),
      },
      { accessorKey: "createdAt", header: "Created", cell: ({ row }) => formatDateTime(row.original.createdAt) },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            disabled={!canManageMemberships || removeMembershipMutation.isPending}
            onClick={() => setConfirmingMembershipId(row.original.id)}
          >
            Remove
          </Button>
        ),
      },
    ],
    [canManageMemberships, draftRoles, removeMembershipMutation.isPending, updateRoleMutation],
  );

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have memberships access." />;
  }

  const target = membershipsQuery.data?.find((entry) => entry.id === confirmingMembershipId) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Memberships</h1>
        <p className="text-sm text-muted-foreground">Membership endpoint view for role and removal administration.</p>
      </div>

      {!canManageMemberships ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Membership role updates/removals are limited to OWNER by backend access rules.
          </p>
        </Card>
      ) : null}

      {membershipsQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load memberships</h2>
          <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(membershipsQuery.error)}</p>
          <Button type="button" className="mt-3" onClick={() => membershipsQuery.refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        data={membershipsQuery.data ?? []}
        loading={membershipsQuery.isPending}
        emptyMessage="No memberships found."
      />

      <ConfirmDialog
        open={Boolean(target)}
        title="Remove membership"
        description={`Remove ${target?.user.email ?? "this membership"}?`}
        confirmLabel="Remove"
        confirming={removeMembershipMutation.isPending}
        onCancel={() => setConfirmingMembershipId(null)}
        onConfirm={async () => {
          if (!target) {
            return;
          }
          try {
            await removeMembershipMutation.mutateAsync(target.id);
            setConfirmingMembershipId(null);
            toast.success("Membership removed.");
          } catch (error) {
            toast.error(getErrorMessage(error, "Failed to remove membership."));
          }
        }}
      />
    </div>
  );
}
