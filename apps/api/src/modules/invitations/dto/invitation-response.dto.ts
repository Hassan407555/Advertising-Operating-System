import { InvitationStatus, MembershipRole } from '@prisma/client';

export class InvitationInvitedByDto {
  id!: string;

  firstName!: string;

  lastName!: string;

  email!: string;
}

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

  invitedBy?: InvitationInvitedByDto | null;
}

export class CreateInvitationResultDto {
  invitation!: InvitationResponseDto;

  token!: string;

  invitationUrl!: string;

  emailSent!: boolean;
}
