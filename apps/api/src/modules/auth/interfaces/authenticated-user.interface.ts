import { MembershipRole } from '@prisma/client';

export interface AuthenticatedUser {
  sub: string;
  organizationId: string;
  role: MembershipRole;
}
