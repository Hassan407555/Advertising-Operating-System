"use client";

import { useEffect, type PropsWithChildren } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/providers/session-provider";

export function PublicOnlyGuard({ children }: PropsWithChildren) {
  const { isAuthenticated, isBootstrapping } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isUnauthorizedRoute = pathname === ROUTES.UNAUTHORIZED;

  useEffect(() => {
    // Unauthorized must remain mountable so cookie rehydration can run even when
    // localStorage still has tokens but the access cookie was cleared.
    if (isUnauthorizedRoute) {
      return;
    }
    if (!isBootstrapping && isAuthenticated) {
      router.replace(ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, isBootstrapping, isUnauthorizedRoute, router]);

  if (isUnauthorizedRoute) {
    return children;
  }

  if (isAuthenticated) {
    return null;
  }

  return children;
}
