import { MembershipRole } from '@prisma/client';

export const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  MANAGER: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export function hasRequiredRole(
  currentRole: MembershipRole,
  requiredRole: MembershipRole,
): boolean {
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
}

export function hasAnyRole(
  currentRole: MembershipRole,
  requiredRoles: MembershipRole[],
): boolean {
  return requiredRoles.some((role) => hasRequiredRole(currentRole, role));
}

export function canManageRole(
  actorRole: MembershipRole,
  targetRole: MembershipRole,
): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

export function canAssignRole(
  actorRole: MembershipRole,
  newRole: MembershipRole,
): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[newRole];
}
