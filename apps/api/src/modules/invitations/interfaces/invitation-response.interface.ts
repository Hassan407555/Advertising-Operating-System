import { MembershipRole } from '@prisma/client';

export interface InvitationResponse {
  id: string;
  email: string;
  role: MembershipRole;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}