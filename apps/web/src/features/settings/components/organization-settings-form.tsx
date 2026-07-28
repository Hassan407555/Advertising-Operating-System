"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { FormFieldText } from "@/components/shared/forms/form-field-text";
import { Button } from "@/components/ui/button";
import {
  updateOrganizationSettingsSchema,
  type UpdateOrganizationSettingsFormValues,
} from "@/features/settings/schemas/settings.schemas";

interface OrganizationSettingsFormProps {
  defaultValues: UpdateOrganizationSettingsFormValues;
  loading: boolean;
  disabled?: boolean;
  serverError?: string;
  onSubmit: (values: UpdateOrganizationSettingsFormValues) => Promise<void>;
}

export function OrganizationSettingsForm({
  defaultValues,
  loading,
  disabled = false,
  serverError,
  onSubmit,
}: OrganizationSettingsFormProps) {
  const form = useForm<UpdateOrganizationSettingsFormValues>({
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        const parsed = updateOrganizationSettingsSchema.safeParse(values);
        if (!parsed.success) {
          parsed.error.issues.forEach((issue) => {
            const path = issue.path[0];
            if (typeof path === "string") {
              form.setError(path as keyof UpdateOrganizationSettingsFormValues, { message: issue.message });
            }
          });
          return;
        }
        await onSubmit(parsed.data);
      })}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <FormFieldText
          label="Organization Name"
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
      </div>
      <FormErrorBanner message={serverError} />
      <FormActions>
        <Button type="button" variant="secondary" onClick={() => form.reset()} disabled={loading || disabled}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || disabled}>
          {loading ? "Saving..." : "Save Organization"}
        </Button>
      </FormActions>
    </form>
  );
}
