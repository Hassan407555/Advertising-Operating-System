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
import { useOrganizationMembersQuery, useRemoveOrganizationMemberMutation, useUpdateOrganizationMemberRoleMutation } from "@/features/organizations/hooks/use-organizations";
import type { OrganizationMember } from "@/features/organizations/types/organization.types";
import { usePermission } from "@/hooks/use-permission";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";

export function MembersPageContent() {
  const canView = usePermission("view");
  const canManage = usePermission("manage");
  const { membership } = useSession();
  const canAccess = canView || membership?.role === "VIEWER";
  const membersQuery = useOrganizationMembersQuery();
  const updateRoleMutation = useUpdateOrganizationMemberRoleMutation();
  const removeMemberMutation = useRemoveOrganizationMemberMutation();
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({});
  const [confirmingMembershipId, setConfirmingMembershipId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<OrganizationMember>[]>(
    () => [
      {
        accessorKey: "user",
        header: "Member",
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
              value={draftRoles[row.original.membershipId] ?? row.original.role}
              onChange={(event) =>
                setDraftRoles((prev) => ({
                  ...prev,
                  [row.original.membershipId]: event.target.value,
                }))
              }
              disabled={!canManage}
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
              disabled={!canManage || updateRoleMutation.isPending}
              onClick={async () => {
                try {
                  await updateRoleMutation.mutateAsync({
                    membershipId: row.original.membershipId,
                    role: (draftRoles[row.original.membershipId] ?? row.original.role) as
                      | "OWNER"
                      | "ADMIN"
                      | "MEMBER"
                      | "VIEWER",
                  });
                  toast.success("Member role updated.");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Failed to update member role."));
                }
              }}
            >
              Save
            </Button>
          </div>
        ),
      },
      {
        accessorKey: "joinedAt",
        header: "Joined",
        cell: ({ row }) => formatDateTime(row.original.joinedAt),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            disabled={!canManage || removeMemberMutation.isPending}
            onClick={() => setConfirmingMembershipId(row.original.membershipId)}
          >
            Remove
          </Button>
        ),
      },
    ],
    [canManage, draftRoles, removeMemberMutation.isPending, updateRoleMutation],
  );

  if (!canAccess) {
    return <PageEmpty title="Access restricted" description="Your role does not have member administration access." />;
  }

  const targetMember = membersQuery.data?.find((member) => member.membershipId === confirmingMembershipId) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">Review organization members, adjust roles, and remove memberships.</p>
      </div>

      {membersQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load members</h2>
          <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(membersQuery.error)}</p>
          <Button type="button" className="mt-3" onClick={() => membersQuery.refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        data={membersQuery.data ?? []}
        loading={membersQuery.isPending}
        emptyMessage="No members found."
      />

      <ConfirmDialog
        open={Boolean(targetMember)}
        title="Remove member"
        description={`Remove ${targetMember?.user.email ?? "this member"} from organization?`}
        confirmLabel="Remove"
        confirming={removeMemberMutation.isPending}
        onCancel={() => setConfirmingMembershipId(null)}
        onConfirm={async () => {
          if (!targetMember) {
            return;
          }
          try {
            await removeMemberMutation.mutateAsync(targetMember.membershipId);
            setConfirmingMembershipId(null);
            toast.success("Member removed.");
          } catch (error) {
            toast.error(getErrorMessage(error, "Failed to remove member."));
          }
        }}
      />
    </div>
  );
}
