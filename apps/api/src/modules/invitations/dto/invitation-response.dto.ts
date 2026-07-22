import { InvitationStatus, MembershipRole } from '@prisma/client';

export class InvitationResponseDto {
  id!: string;

  organizationId!: string;

  email!: string;

  role!: MembershipRole;

  status!: InvitationStatus;

  expiresAt!: Date;

  acceptedAt!: Date | null;

  createdAt!: Date;

  updatedAt!: Date;
}
