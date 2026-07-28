"use client";

import { useMemo } from "react";
import { hasPermission } from "@/lib/permissions/roles";
import { useSession } from "@/providers/session-provider";
import type { PermissionAction } from "@/types/permissions";

export function usePermission(action: PermissionAction) {
  const { membership } = useSession();

  return useMemo(() => hasPermission(membership?.role, action), [action, membership?.role]);
}
