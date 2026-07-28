import type { Role } from "@/types/auth";
import type { PermissionAction } from "@/types/permissions";

const OWNER_ADMIN: Role[] = ["OWNER", "ADMIN"];
const OWNER_ADMIN_MEMBER: Role[] = ["OWNER", "ADMIN", "MEMBER"];

const permissionMatrix: Record<PermissionAction, Role[]> = {
  view: OWNER_ADMIN_MEMBER,
  create: OWNER_ADMIN,
  edit: OWNER_ADMIN,
  delete: OWNER_ADMIN,
  publish: OWNER_ADMIN,
  sync: OWNER_ADMIN,
  manage: OWNER_ADMIN,
  run: OWNER_ADMIN,
};

export function hasPermission(role: Role | null | undefined, action: PermissionAction): boolean {
  if (!role) {
    return false;
  }

  return permissionMatrix[action].includes(role);
}
