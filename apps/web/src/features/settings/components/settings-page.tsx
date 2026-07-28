"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageEmpty } from "@/components/shared/states/page-empty";
import { PageError } from "@/components/shared/states/page-error";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/states/page-loading";
import { StatusBadge } from "@/components/shared/status-badge";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/features/auth/api/auth.api";
import { OrganizationSettingsForm } from "@/features/settings/components/organization-settings-form";
import { UserProfileForm } from "@/features/settings/components/user-profile-form";
import { SETTINGS_COPY } from "@/features/settings/constants/settings.constants";
import { useUpdateUserProfileMutation, useUserProfileQuery } from "@/features/settings/hooks/use-settings";
import {
  useCurrentOrganizationQuery,
  useUpdateCurrentOrganizationMutation,
} from "@/features/organizations/hooks/use-organizations";
import type {
  UpdateOrganizationSettingsFormValues,
  UpdateUserProfileFormValues,
} from "@/features/settings/schemas/settings.schemas";
import { usePermission } from "@/hooks/use-permission";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";
import { formatDateTime } from "@/utils/formatters";

export function SettingsPageContent() {
  const canView = usePermission("view");
  const canManage = usePermission("manage");
  const { applyCurrentUser, patchActiveOrganization } = useSession();

  const profileQuery = useUserProfileQuery();
  const updateProfileMutation = useUpdateUserProfileMutation();
  const organizationQuery = useCurrentOrganizationQuery();
  const updateOrganizationMutation = useUpdateCurrentOrganizationMutation();

  const handleProfileSubmit = async (values: UpdateUserProfileFormValues) => {
    try {
      await updateProfileMutation.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || undefined,
        jobTitle: values.jobTitle || undefined,
        bio: values.bio || undefined,
        timezone: values.timezone || undefined,
        language: values.language || undefined,
        avatarUrl: values.avatarUrl || undefined,
      });
      const currentUser = await getCurrentUser();
      applyCurrentUser(currentUser);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update profile."));
    }
  };

  const handleOrganizationSubmit = async (values: UpdateOrganizationSettingsFormValues) => {
    if (!canManage) {
      toast.error("Your role cannot update organization settings.");
      return;
    }

    try {
      const updated = await updateOrganizationMutation.mutateAsync(values);
      patchActiveOrganization({ name: updated.name, slug: updated.slug });
      toast.success("Organization settings updated.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update organization settings."));
    }
  };

  if (!canView) {
    return <PageEmpty title="Access restricted" description="Your role does not have settings access." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={SETTINGS_COPY.title}
        description={SETTINGS_COPY.description}
        actions={
          <Link href={ROUTES.ORGANIZATION}>
            <Button type="button" variant="secondary">
              Open Organization
            </Button>
          </Link>
        }
      />

      {profileQuery.isError ? (
        <PageError
          title="Unable to load profile"
          message={getErrorMessage(profileQuery.error, "Profile settings could not be loaded.")}
          onRetry={() => profileQuery.refetch()}
        />
      ) : null}

      {profileQuery.isLoading ? <PageLoading cards={2} /> : null}

      {profileQuery.data ? (
        <>
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">{SETTINGS_COPY.accountTitle}</h2>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Email:</span> {profileQuery.data.email}
              </p>
              <p className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>{" "}
                <StatusBadge status={profileQuery.data.status} />
              </p>
              <p>
                <span className="text-muted-foreground">Last Login:</span>{" "}
                {profileQuery.data.lastLoginAt ? formatDateTime(profileQuery.data.lastLoginAt) : "N/A"}
              </p>
              <p>
                <span className="text-muted-foreground">Email Verified:</span>{" "}
                {profileQuery.data.emailVerifiedAt ? formatDateTime(profileQuery.data.emailVerifiedAt) : "N/A"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{SETTINGS_COPY.emailPasswordLimitation}</p>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">{SETTINGS_COPY.profileTitle}</h2>
            <UserProfileForm
              profile={profileQuery.data}
              loading={updateProfileMutation.isPending}
              serverError={
                updateProfileMutation.isError ? getErrorMessage(updateProfileMutation.error) : undefined
              }
              onSubmit={handleProfileSubmit}
            />
          </Card>
        </>
      ) : null}

      {organizationQuery.isError ? (
        <PageError
          title="Unable to load organization settings"
          message={getErrorMessage(organizationQuery.error, "Organization settings could not be loaded.")}
          onRetry={() => organizationQuery.refetch()}
        />
      ) : null}

      {organizationQuery.data ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">{SETTINGS_COPY.organizationTitle}</h2>
          <p className="text-sm text-muted-foreground">
            Update the name and slug for your current organization.
          </p>
          <OrganizationSettingsForm
            defaultValues={{
              name: organizationQuery.data.name,
              slug: organizationQuery.data.slug,
            }}
            loading={updateOrganizationMutation.isPending}
            disabled={!canManage}
            serverError={
              updateOrganizationMutation.isError
                ? getErrorMessage(updateOrganizationMutation.error)
                : undefined
            }
            onSubmit={handleOrganizationSubmit}
          />
          {!canManage ? (
            <p className="text-xs text-muted-foreground">
              Organization updates require manage permission. Your role can view current values only.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
