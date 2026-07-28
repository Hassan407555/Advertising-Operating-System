"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { FormFieldText } from "@/components/shared/forms/form-field-text";
import { Button } from "@/components/ui/button";
import {
  updateUserProfileSchema,
  type UpdateUserProfileFormValues,
} from "@/features/settings/schemas/settings.schemas";
import type { UserProfile } from "@/features/settings/types/settings.types";

interface UserProfileFormProps {
  profile: UserProfile;
  loading: boolean;
  serverError?: string;
  onSubmit: (values: UpdateUserProfileFormValues) => Promise<void>;
}

export function UserProfileForm({ profile, loading, serverError, onSubmit }: UserProfileFormProps) {
  const form = useForm<UpdateUserProfileFormValues>({
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? "",
      jobTitle: profile.jobTitle ?? "",
      bio: profile.bio ?? "",
      timezone: profile.timezone ?? "",
      language: profile.language ?? "",
      avatarUrl: profile.avatarUrl ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? "",
      jobTitle: profile.jobTitle ?? "",
      bio: profile.bio ?? "",
      timezone: profile.timezone ?? "",
      language: profile.language ?? "",
      avatarUrl: profile.avatarUrl ?? "",
    });
  }, [form, profile]);

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        const parsed = updateUserProfileSchema.safeParse(values);
        if (!parsed.success) {
          parsed.error.issues.forEach((issue) => {
            const path = issue.path[0];
            if (typeof path === "string") {
              form.setError(path as keyof UpdateUserProfileFormValues, { message: issue.message });
            }
          });
          return;
        }
        await onSubmit(parsed.data);
      })}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <FormFieldText
          label="First Name"
          name="firstName"
          register={form.register}
          error={form.formState.errors.firstName?.message}
        />
        <FormFieldText
          label="Last Name"
          name="lastName"
          register={form.register}
          error={form.formState.errors.lastName?.message}
        />
        <FormFieldText
          label="Phone"
          name="phone"
          register={form.register}
          error={form.formState.errors.phone?.message}
        />
        <FormFieldText
          label="Job Title"
          name="jobTitle"
          register={form.register}
          error={form.formState.errors.jobTitle?.message}
        />
        <FormFieldText
          label="Timezone"
          name="timezone"
          register={form.register}
          error={form.formState.errors.timezone?.message}
          placeholder="America/New_York"
        />
        <FormFieldText
          label="Language"
          name="language"
          register={form.register}
          error={form.formState.errors.language?.message}
          placeholder="en"
        />
      </div>

      <FormFieldText
        label="Avatar URL"
        name="avatarUrl"
        register={form.register}
        error={form.formState.errors.avatarUrl?.message}
        placeholder="https://example.com/avatar.png"
      />

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="bio">
          Bio
        </label>
        <textarea
          id="bio"
          className="min-h-24 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          {...form.register("bio")}
        />
        {form.formState.errors.bio?.message ? (
          <p className="text-xs text-red-400">{form.formState.errors.bio.message}</p>
        ) : null}
      </div>

      <FormErrorBanner message={serverError} />

      <FormActions>
        <Button type="button" variant="secondary" onClick={() => form.reset()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </FormActions>
    </form>
  );
}
