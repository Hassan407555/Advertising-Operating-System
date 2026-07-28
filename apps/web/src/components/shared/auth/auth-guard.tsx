"use client";

import { useEffect, type PropsWithChildren } from "react";
import { useRouter } from "next/navigation";
import { PageLoading } from "@/components/shared/states/page-loading";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/providers/session-provider";

export function AuthGuard({ children }: PropsWithChildren) {
  const { isAuthenticated, isBootstrapping } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
  }, [isAuthenticated, isBootstrapping, router]);

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
