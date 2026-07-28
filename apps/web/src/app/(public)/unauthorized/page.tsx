"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";

export default function UnauthorizedPage() {
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo");
  const loginHref = redirectTo ? `${ROUTES.LOGIN}?redirectTo=${encodeURIComponent(redirectTo)}` : ROUTES.LOGIN;

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
