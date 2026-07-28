"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageEmpty } from "@/components/shared/states/page-empty";
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
  const { applyCurrentUser } = useSession();

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
      await updateOrganizationMutation.mutateAsync(values);
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{SETTINGS_COPY.title}</h1>
          <p className="text-sm text-muted-foreground">{SETTINGS_COPY.description}</p>
        </div>
        <Link href={ROUTES.ORGANIZATION}>
          <Button type="button" variant="secondary">
            Open Organization Admin
          </Button>
        </Link>
      </div>

      {profileQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(profileQuery.error)}</p>
          <Button type="button" className="mt-3" onClick={() => profileQuery.refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {profileQuery.data ? (
        <>
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">{SETTINGS_COPY.accountTitle}</h2>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Email:</span> {profileQuery.data.email}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span> {profileQuery.data.status}
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
      ) : (
        <Card>
          <p className="text-sm text-muted-foreground">Loading profile settings...</p>
        </Card>
      )}

      {organizationQuery.isError ? (
        <Card>
          <h2 className="text-lg font-semibold">Unable to load organization settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(organizationQuery.error)}</p>
          <Button type="button" className="mt-3" onClick={() => organizationQuery.refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {organizationQuery.data ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">{SETTINGS_COPY.organizationTitle}</h2>
          <p className="text-sm text-muted-foreground">
            Backend supports updating organization name and slug for the current organization.
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
