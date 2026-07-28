"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { FormFieldText } from "@/components/shared/forms/form-field-text";
import { connectShopifySchema, type ConnectShopifyFormValues } from "@/features/shopify/schemas/shopify.schemas";

interface ShopifyConnectFormProps {
  loading: boolean;
  serverError?: string;
  onSubmit: (values: ConnectShopifyFormValues) => Promise<void>;
}

export function ShopifyConnectForm({ loading, serverError, onSubmit }: ShopifyConnectFormProps) {
  const form = useForm<ConnectShopifyFormValues>({
    defaultValues: {
      shopDomain: "",
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        const parsed = connectShopifySchema.safeParse(values);
        if (!parsed.success) {
          parsed.error.issues.forEach((issue) => {
            const path = issue.path[0];
            if (typeof path === "string") {
              form.setError(path as keyof ConnectShopifyFormValues, { message: issue.message });
            }
          });
          return;
        }
        await onSubmit(parsed.data);
      })}
    >
      <FormFieldText
        label="Shop Domain"
        name="shopDomain"
        register={form.register}
        placeholder="my-store.myshopify.com"
        error={form.formState.errors.shopDomain?.message}
      />
      <FormErrorBanner message={serverError} />
      <FormActions>
        <Button type="button" variant="secondary" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Preparing OAuth..." : "Connect Store"}
        </Button>
      </FormActions>
    </form>
  );
}
