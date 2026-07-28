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
import { useLoginMutation } from "@/features/auth/hooks/use-auth-mutations";
import { loginSchema, type LoginSchema } from "@/features/auth/schemas/auth.schemas";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";

export default function LoginPage() {
  const { applyAuthLogin, setTokens } = useSession();
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
      toast.success("Logged in successfully.");
      router.replace(params.get("redirectTo") ?? ROUTES.DASHBOARD);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to login."));
    }
  });

  return (
    <Card>
      <h1 className="text-xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sign in to continue to your workspace.</p>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
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

      <p className="mt-4 text-xs text-muted-foreground">
        Need an account?{" "}
        <Link className="text-primary underline-offset-2 hover:underline" href={ROUTES.REGISTER}>
          Register
        </Link>
      </p>
    </Card>
  );
}
