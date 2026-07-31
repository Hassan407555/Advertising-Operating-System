"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormActions } from "@/components/shared/forms/form-actions";
import { FormErrorBanner } from "@/components/shared/forms/form-error-banner";
import { FormFieldText } from "@/components/shared/forms/form-field-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/features/auth/api/auth.api";
import { useLoginMutation } from "@/features/auth/hooks/use-auth-mutations";
import { loginSchema, type LoginSchema } from "@/features/auth/schemas/auth.schemas";
import { getSafeRedirectPath } from "@/lib/navigation/safe-redirect";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";

export default function LoginPage() {
  const { applyAuthLogin, applyCurrentUser, setTokens, setActiveOrganization } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const mutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = await mutation.mutateAsync(values);
      setTokens(payload.tokens);
      applyAuthLogin(payload);
      try {
        const currentUser = await getCurrentUser();
        applyCurrentUser(currentUser);
        setActiveOrganization(payload.organization.id);
      } catch {
        // Keep login payload session if /auth/me hydration fails.
      }
      toast.success("Logged in successfully.");
      router.replace(getSafeRedirectPath(params.get("redirectTo"), ROUTES.DASHBOARD));
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to login."));
    }
  });

  return (
    <Card variant="elevated" padding="lg" className="animate-fade-in-up">
      <p className="text-eyebrow">AI Meta Ads Studio</p>
      <h1 className="mt-2 text-title">Sign in</h1>
      <p className="mt-2 text-body-sm">Continue to your advertising workspace.</p>

      <form className="mt-6 space-y-4" method="post" onSubmit={onSubmit}>
        <FormFieldText
          label="Email"
          name="email"
          type="email"
          placeholder="you@company.com"
          register={register}
          error={errors.email?.message}
        />
        <FormFieldText
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          register={register}
          error={errors.password?.message}
        />
        <FormErrorBanner message={mutation.isError ? getErrorMessage(mutation.error) : undefined} />
        <FormActions>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </FormActions>
      </form>

      <p className="mt-5 text-caption">
        Need an account?{" "}
        <Link className="font-medium text-primary underline-offset-2 hover:underline" href={ROUTES.REGISTER}>
          Register
        </Link>
      </p>
    </Card>
  );
}
