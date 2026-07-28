"use client";

import { useEffect, type PropsWithChildren } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PageLoading } from "@/components/shared/states/page-loading";
import { ROUTES } from "@/constants/routes";
import { getSafeRedirectPath } from "@/lib/navigation/safe-redirect";
import { useSession } from "@/providers/session-provider";

export function AuthGuard({ children }: PropsWithChildren) {
  const { isAuthenticated, isBootstrapping } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) {
      const redirectTo = getSafeRedirectPath(pathname, ROUTES.DASHBOARD);
      router.replace(`${ROUTES.LOGIN}?redirectTo=${encodeURIComponent(redirectTo)}`);
    }
  }, [isAuthenticated, isBootstrapping, pathname, router]);

  if (isBootstrapping) {
    return (
      <div className="p-4">
        <PageLoading />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}
