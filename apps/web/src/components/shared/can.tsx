"use client";

import type { PropsWithChildren } from "react";
import { usePermission } from "@/hooks/use-permission";
import type { PermissionAction } from "@/types/permissions";

interface CanProps extends PropsWithChildren {
  action: PermissionAction;
  fallback?: React.ReactNode;
}

export function Can({ action, fallback = null, children }: CanProps) {
  const allowed = usePermission(action);
  return allowed ? children : fallback;
}
