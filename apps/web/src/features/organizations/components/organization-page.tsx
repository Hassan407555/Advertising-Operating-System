"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { FormFieldText } from "@/components/shared/forms/form-field-text";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/features/auth/api/auth.api";
import {
  updateOrganizationSchema,
  type UpdateOrganizationFormValues,
} from "@/features/organizations/schemas/organization.schemas";
import { useCurrentOrganizationQuery, useSwitchOrganizationMutation, useUpdateCurrentOrganizationMutation } from "@/features/organizations/hooks/use-organizations";
import { usePermission } from "@/hooks/use-permission";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";

export function OrganizationPageContent() {
  const canView = usePermission("view");
  const canManage = usePermission("manage");
  const { organizations, organization, membership, setTokens, applyCurrentUser, setActiveOrganization } = useSession();
  const isViewer = membership?.role === "VIEWER";
  const canAccess = canView || isViewer;

  const queryClient = useQueryClient();
  const organizationQuery = useCurrentOrganizationQuery();
  const updateOrganizationMutation = useUpdateCurrentOrganizationMutation();
  const switchOrganizationMutation = useSwitchOrganizationMutation();

  const form = useForm<UpdateOrganizationFormValues>({
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  useEffect(() => {
    if (!organizationQuery.data) {
      return;
    }
    form.reset({
      name: organizationQuery.data.name,
      slug: organizationQuery.data.slug,
    });
  }, [form, organizationQuery.data]);

  const handleSwitchOrganization = async (organizationId: string) => {
    try {
      const result = await switchOrganizationMutation.mutateAsync(organizationId);
      setTokens(result.tokens);
      const currentUser = await getCurrentUser();
      applyCurrentUser(currentUser);
      setActiveOrganization(result.organization.id);
      await queryClient.clear();
      toast.success(`Switched to ${result.organization.name}.`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to switch organization."));
    }
  };

  if (!canAccess) {
    return <PageEmpty title="Access restricted" description="Your role does not have organization access." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Organization Administration</h1>
        <p className="text-sm text-muted-foreground">Manage your current organization profile and switch active organization.</p>
      </div>

      {organizationQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load organization</h2>
          <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(organizationQuery.error)}</p>
          <Button type="button" className="mt-3" onClick={() => organizationQuery.refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {organizationQuery.data ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Current Organization</h2>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p><span className="text-muted-foreground">ID:</span> {organizationQuery.data.id}</p>
            <p><span className="text-muted-foreground">Name:</span> {organizationQuery.data.name}</p>
            <p><span className="text-muted-foreground">Slug:</span> {organizationQuery.data.slug}</p>
            <p><span className="text-muted-foreground">Role:</span> {organizationQuery.data.membershipRole ?? "N/A"}</p>
            <p><span className="text-muted-foreground">Created:</span> {formatDateTime(organizationQuery.data.createdAt)}</p>
            <p><span className="text-muted-foreground">Updated:</span> {formatDateTime(organizationQuery.data.updatedAt)}</p>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Update Current Organization</h2>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit(async (values) => {
            if (!canManage) {
              toast.error("Your role cannot update organization settings.");
              return;
            }

            const parsed = updateOrganizationSchema.safeParse(values);
            if (!parsed.success) {
              parsed.error.issues.forEach((issue) => {
                const path = issue.path[0];
                if (typeof path === "string") {
                  form.setError(path as keyof UpdateOrganizationFormValues, { message: issue.message });
                }
              });
              return;
            }

            try {
              await updateOrganizationMutation.mutateAsync(parsed.data);
              toast.success("Organization updated.");
            } catch (error) {
              toast.error(getErrorMessage(error, "Failed to update organization."));
            }
          })}
        >
          <FormFieldText
            label="Name"
            name="name"
            register={form.register}
            error={form.formState.errors.name?.message}
          />
          <FormFieldText
            label="Slug"
            name="slug"
            register={form.register}
            error={form.formState.errors.slug?.message}
          />
          <FormErrorBanner message={updateOrganizationMutation.isError ? getErrorMessage(updateOrganizationMutation.error) : undefined} />
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => form.reset()}>
              Reset
            </Button>
            <Button type="submit" disabled={updateOrganizationMutation.isPending || !canManage}>
              {updateOrganizationMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </FormActions>
        </form>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Switch Organization</h2>
        {organizations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organizations available in current session.</p>
        ) : (
          <div className="space-y-2">
            {organizations.map((entry) => {
              const active = organization?.id === entry.id;
              return (
                <div key={entry.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.slug}</p>
                  </div>
                  <Button
                    type="button"
                    variant={active ? "secondary" : "outline"}
                    disabled={active || switchOrganizationMutation.isPending}
                    onClick={() => handleSwitchOrganization(entry.id)}
                  >
                    {active ? "Active" : "Switch"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
