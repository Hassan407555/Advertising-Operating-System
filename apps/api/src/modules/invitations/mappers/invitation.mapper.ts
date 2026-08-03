import { Invitation, User } from '@prisma/client';

import { InvitationResponseDto } from '../dto/invitation-response.dto';

type InvitationWithCreator = Invitation & {
  createdByUser?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null;
};

export class InvitationMapper {
  static toResponse(invitation: InvitationWithCreator): InvitationResponseDto {
    return {
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
      invitedBy: invitation.createdByUser
        ? {
            id: invitation.createdByUser.id,
            firstName: invitation.createdByUser.firstName,
            lastName: invitation.createdByUser.lastName,
            email: invitation.createdByUser.email,
          }
        : undefined,
    };
  }

  static toResponseList(
    invitations: InvitationWithCreator[],
  ): InvitationResponseDto[] {
    return invitations.map((invitation) =>
      InvitationMapper.toResponse(invitation),
    );
  }
}
