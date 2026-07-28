"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { syncAccessCookieFromStorage } from "@/lib/auth/token-storage";
import { getSafeRedirectPath } from "@/lib/navigation/safe-redirect";

export default function UnauthorizedPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = getSafeRedirectPath(params.get("redirectTo"), ROUTES.DASHBOARD);
  const loginHref = `${ROUTES.LOGIN}?redirectTo=${encodeURIComponent(redirectTo)}`;

  useEffect(() => {
    if (!syncAccessCookieFromStorage()) {
      return;
    }
    router.replace(redirectTo);
  }, [redirectTo, router]);

  return (
    <Card>
      <h1 className="text-xl font-semibold">Unauthorized</h1>
      <p className="mt-2 text-sm text-muted-foreground">Please login to access this page.</p>
      <Link href={loginHref} className="mt-4 inline-block text-sm text-primary underline-offset-2 hover:underline">
        Go to login
      </Link>
    </Card>
  );
}
