"use client";

import { useEffect, type PropsWithChildren } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/providers/session-provider";

export function PublicOnlyGuard({ children }: PropsWithChildren) {
  const { isAuthenticated, isBootstrapping } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isBootstrapping && isAuthenticated) {
      router.replace(ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, isBootstrapping, router]);

  if (isAuthenticated) {
    return null;
  }

  return children;
}
