import { MembershipRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: MembershipRole;
}
