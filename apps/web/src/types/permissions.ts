import type { Role } from "@/types/auth";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "publish"
  | "sync"
  | "manage"
  | "run";

export interface PermissionRule {
  action: PermissionAction;
  roles: Role[];
}
