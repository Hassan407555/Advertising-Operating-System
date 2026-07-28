"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { aiCopyGenerateSchema, type AiCopyGenerateFormValues } from "@/features/ai-copy/schemas/ai-copy.schemas";
import type { Campaign } from "@/types/campaign";

interface AiCopyFormProps {
  campaigns: Campaign[];
  loading: boolean;
  serverError?: string;
  onSubmit: (values: AiCopyGenerateFormValues) => Promise<void>;
  onCancel: () => void;
}

export function AiCopyForm({ campaigns, loading, serverError, onSubmit, onCancel }: AiCopyFormProps) {
  const form = useForm<AiCopyGenerateFormValues>({
    defaultValues: {
      campaignId: "",
    },
  });

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [form.formState.isDirty]);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const parsed = aiCopyGenerateSchema.safeParse(values);
        if (!parsed.success) {
          parsed.error.issues.forEach((issue) => {
            const path = issue.path[0];
            if (typeof path === "string") {
              form.setError(path as keyof AiCopyGenerateFormValues, { message: issue.message });
            }
          });
          return;
        }
        await onSubmit(parsed.data);
      })}
    >
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">AI Copy Generation</h2>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="campaignId">
            Campaign
          </label>
          <select
            id="campaignId"
            className="h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm"
            {...form.register("campaignId")}
          >
            <option value="">Select campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} ({campaign.status})
              </option>
            ))}
          </select>
          {form.formState.errors.campaignId?.message ? (
            <p className="text-xs text-red-400">{form.formState.errors.campaignId.message}</p>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Generation writes copy directly to related creatives and ads. Separate accept/history endpoints are not available.
        </p>
      </Card>

      <FormErrorBanner message={serverError} />

      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Generate AI Copy"}
        </Button>
      </FormActions>
    </form>
  );
}
