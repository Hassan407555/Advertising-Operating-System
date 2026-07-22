import { MembershipRole } from '@prisma/client';

export const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  MANAGER: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export function hasRole(
  current: MembershipRole,
  required: MembershipRole,
): boolean {
  return ROLE_HIERARCHY[current] >= ROLE_HIERARCHY[required];
}
