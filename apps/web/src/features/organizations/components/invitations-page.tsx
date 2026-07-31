"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { FormFieldText } from "@/components/shared/forms/form-field-text";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { MEMBERSHIP_ROLE_OPTIONS } from "@/features/organizations/constants/organization.constants";
import {
  acceptInvitationSchema,
  createInvitationSchema,
  type AcceptInvitationFormValues,
  type CreateInvitationFormValues,
} from "@/features/organizations/schemas/organization.schemas";
import { useAcceptInvitationMutation, useCreateInvitationMutation } from "@/features/organizations/hooks/use-organizations";
import { getCurrentUser } from "@/features/auth/api/auth.api";
import { usePermission } from "@/hooks/use-permission";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";

export function InvitationsPageContent() {
  const router = useRouter();
  const canView = usePermission("view");
  const canManage = usePermission("manage");
  const queryClient = useQueryClient();
  const { organization, applyCurrentUser } = useSession();
  const createInvitationMutation = useCreateInvitationMutation();
  const acceptInvitationMutation = useAcceptInvitationMutation();

  const createForm = useForm<CreateInvitationFormValues>({
    defaultValues: {
      email: "",
      role: "MEMBER",
    },
  });
  const acceptForm = useForm<AcceptInvitationFormValues>({
    defaultValues: {
      token: "",
    },
  });

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have invitation access." />;
  }

  if (!organization) {
    return <PageEmpty title="No active organization" description="An active organization is required." />;
  }

  return (
    <div className="page-stack animate-fade-in-up">
      <PageHeader
        eyebrow="Workspace"
        title="Invitations"
        description="Create organization invitations and accept invitation tokens."
      />

      <Card className="space-y-3">
        <SectionHeader title="Invite Member" />
        <form
          className="space-y-3"
          onSubmit={createForm.handleSubmit(async (values) => {
            if (!canManage) {
              toast.error("Your role cannot create invitations.");
              return;
            }
            const parsed = createInvitationSchema.safeParse(values);
            if (!parsed.success) {
              parsed.error.issues.forEach((issue) => {
                const path = issue.path[0];
                if (typeof path === "string") {
                  createForm.setError(path as keyof CreateInvitationFormValues, { message: issue.message });
                }
              });
              return;
            }

            try {
              const result = await createInvitationMutation.mutateAsync({
                organizationId: organization.id,
                ...parsed.data,
              });
              toast.success("Invitation created.");
              createForm.reset();
              navigator.clipboard.writeText(result.token).catch(() => null);
            } catch (error) {
              toast.error(getErrorMessage(error, "Failed to create invitation."));
            }
          })}
        >
          <FormFieldText
            label="Invitee Email"
            name="email"
            register={createForm.register}
            error={createForm.formState.errors.email?.message}
            placeholder="teammate@company.com"
            type="email"
          />
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
              {...createForm.register("role")}
            >
              {MEMBERSHIP_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {createForm.formState.errors.role?.message ? (
              <p className="text-xs text-red-400">{createForm.formState.errors.role.message}</p>
            ) : null}
          </div>
          <FormErrorBanner message={createInvitationMutation.isError ? getErrorMessage(createInvitationMutation.error) : undefined} />
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => createForm.reset()}>
              Reset
            </Button>
            <Button type="submit" disabled={createInvitationMutation.isPending || !canManage}>
              {createInvitationMutation.isPending ? "Inviting..." : "Send Invitation"}
            </Button>
          </FormActions>
        </form>
      </Card>

      {createInvitationMutation.data ? (
        <Card className="space-y-2">
          <SectionHeader title="Latest Invitation Result" size="sm" />
          <p className="text-sm">
            Invitation ID: <span className="text-muted-foreground">{createInvitationMutation.data.invitation.id}</span>
          </p>
          <p className="text-sm">
            Email: <span className="text-muted-foreground">{createInvitationMutation.data.invitation.email}</span>
          </p>
          <p className="text-sm">
            Role: <span className="text-muted-foreground">{createInvitationMutation.data.invitation.role}</span>
          </p>
          <p className="text-sm">
            Expires: <span className="text-muted-foreground">{formatDateTime(createInvitationMutation.data.invitation.expiresAt)}</span>
          </p>
          <p className="text-sm">
            Invitation Token:{" "}
            <span data-testid="invitation-token" className="break-all text-muted-foreground">
              {createInvitationMutation.data.token}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Invitation token is shown above and copied to clipboard when possible.
          </p>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <SectionHeader title="Accept Invitation" />
        <form
          className="space-y-3"
          onSubmit={acceptForm.handleSubmit(async (values) => {
            const parsed = acceptInvitationSchema.safeParse(values);
            if (!parsed.success) {
              parsed.error.issues.forEach((issue) => {
                const path = issue.path[0];
                if (typeof path === "string") {
                  acceptForm.setError(path as keyof AcceptInvitationFormValues, { message: issue.message });
                }
              });
              return;
            }
            try {
              await acceptInvitationMutation.mutateAsync(parsed.data);
              const currentUser = await getCurrentUser();
              applyCurrentUser(currentUser);
              await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORGANIZATIONS });
              toast.success("Invitation accepted.");
              acceptForm.reset();
              void router.push(ROUTES.DASHBOARD);
            } catch (error) {
              toast.error(getErrorMessage(error, "Failed to accept invitation."));
            }
          })}
        >
          <FormFieldText
            label="Invitation Token"
            name="token"
            register={acceptForm.register}
            error={acceptForm.formState.errors.token?.message}
            placeholder="Paste invitation token"
          />
          <FormErrorBanner message={acceptInvitationMutation.isError ? getErrorMessage(acceptInvitationMutation.error) : undefined} />
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => acceptForm.reset()}>
              Reset
            </Button>
            <Button type="submit" disabled={acceptInvitationMutation.isPending}>
              {acceptInvitationMutation.isPending ? "Accepting..." : "Accept Invitation"}
            </Button>
          </FormActions>
        </form>
      </Card>
    </div>
  );
}
