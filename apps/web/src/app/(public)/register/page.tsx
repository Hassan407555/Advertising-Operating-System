"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { FormFieldText } from "@/components/shared/forms/form-field-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { useRegisterMutation } from "@/features/auth/hooks/use-auth-mutations";
import { registerSchema, type RegisterSchema } from "@/features/auth/schemas/auth.schemas";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";

export default function RegisterPage() {
  const { applyAuthLogin, setTokens } = useSession();
  const router = useRouter();
  const mutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      organizationName: "",
      email: "",
      firstName: "",
      lastName: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = await mutation.mutateAsync(values);
      setTokens(payload.tokens);
      applyAuthLogin(payload);
      toast.success("Account created successfully.");
      router.replace(ROUTES.DASHBOARD);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to register."));
    }
  });

  return (
    <Card>
      <h1 className="text-xl font-semibold">Register</h1>
      <p className="mt-2 text-sm text-muted-foreground">Create your organization and owner account.</p>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <FormFieldText
          label="Organization Name"
          name="organizationName"
          placeholder="Acme Ads"
          register={register}
          error={errors.organizationName?.message}
        />
        <FormFieldText label="First Name" name="firstName" register={register} error={errors.firstName?.message} />
        <FormFieldText label="Last Name" name="lastName" register={register} error={errors.lastName?.message} />
        <FormFieldText
          label="Email"
          name="email"
          type="email"
          register={register}
          placeholder="owner@acme.com"
          error={errors.email?.message}
        />
        <FormFieldText
          label="Password"
          name="password"
          type="password"
          register={register}
          error={errors.password?.message}
          placeholder="At least 8 chars, upper/lower/number"
        />
        <FormErrorBanner message={mutation.isError ? getErrorMessage(mutation.error) : undefined} />
        <FormActions>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Account"}
          </Button>
        </FormActions>
      </form>

      <p className="mt-4 text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link className="text-primary underline-offset-2 hover:underline" href={ROUTES.LOGIN}>
          Login
        </Link>
      </p>
    </Card>
  );
}
