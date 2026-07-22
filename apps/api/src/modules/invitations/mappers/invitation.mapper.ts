import { Invitation } from '@prisma/client';

import { InvitationResponseDto } from '../dto/invitation-response.dto';

export class InvitationMapper {
  static toResponse(invitation: Invitation): InvitationResponseDto {
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
    };
  }

  static toResponseList(invitations: Invitation[]): InvitationResponseDto[] {
    return invitations.map((invitation) =>
      InvitationMapper.toResponse(invitation),
    );
  }
}
