import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  Invitation,
  InvitationStatus,
  MembershipRole,
  Prisma,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { InvitationResponseDto } from '../dto/invitation-response.dto';
import { InvitationMapper } from '../mappers/invitation.mapper';

export interface CreateInvitationResult {
  invitation: InvitationResponseDto;
  token: string;
}

@Injectable()
export class InvitationsService {
  private static readonly INVITATION_EXPIRY_DAYS = 7;
  private static readonly TOKEN_BYTES = 32;

  constructor(private readonly prisma: PrismaService) {}

  private generateToken(): string {
    return randomBytes(InvitationsService.TOKEN_BYTES).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getExpirationDate(): Date {
    return new Date(
      Date.now() +
        InvitationsService.INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
  }

  private async validateOrganizationExists(
    organizationId: string,
  ): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }
  }

  private async validateUserIsAdminOrOwner(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You are not a member of this organization.',
      );
    }

    if (
      membership.role !== MembershipRole.OWNER &&
      membership.role !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only organization owners and admins can send invitations.',
      );
    }
  }

  private async validateEmailNotMember(
    organizationId: string,
    email: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (membership) {
      throw new ConflictException(
        'This email is already associated with a member of this organization.',
      );
    }
  }

  private async validateNoPendingInvitation(
    organizationId: string,
    email: string,
  ): Promise<void> {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        organizationId,
        email,
        status: InvitationStatus.PENDING,
      },
      select: {
        id: true,
      },
    });

    if (invitation) {
      throw new ConflictException(
        'A pending invitation already exists for this email.',
      );
    }
  }

  private async findPendingInvitationByToken(
    token: string,
  ): Promise<Invitation> {
    const tokenHash = this.hashToken(token);

    const invitation = await this.prisma.invitation.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ConflictException('This invitation is no longer available.');
    }

    return invitation;
  }

  private validateInvitationNotExpired(invitation: Invitation): void {
    if (invitation.expiresAt < new Date()) {
      throw new ConflictException('This invitation has expired.');
    }
  }

  private validateInvitationMatchesUser(
    invitation: Invitation,
    currentUser: JwtPayload,
  ): void {
    if (currentUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        'This invitation does not belong to your account.',
      );
    }
  }

  private async validateUserNotAlreadyMember(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (membership) {
      throw new ConflictException(
        'You are already a member of this organization.',
      );
    }
  }

  private async createInvitationWithAudit(
    organizationId: string,
    email: string,
    role: MembershipRole,
    createdByUserId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<Invitation> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const invitation = await tx.invitation.create({
          data: {
            organizationId,
            email,
            role,
            tokenHash,
            expiresAt,
            createdByUserId,
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId,
            actorId: createdByUserId,
            action: AuditAction.INVITATION_CREATED,
            entity: AuditEntity.INVITATION,
            entityId: invitation.id,
            metadata: {
              email: invitation.email,
              role: invitation.role,
              expiresAt: invitation.expiresAt,
            },
          },
        });

        return invitation;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Unable to create invitation due to a duplicate token. Please try again.',
        );
      }

      throw error;
    }
  }

  private async acceptInvitationWithAudit(
    invitation: Invitation,
    userId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.membership.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: invitation.organizationId,
          actorId: userId,
          action: AuditAction.INVITATION_ACCEPTED,
          entity: AuditEntity.INVITATION,
          entityId: invitation.id,
          metadata: {
            email: invitation.email,
            role: invitation.role,
          },
        },
      });
    });
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateInvitationDto,
  ): Promise<CreateInvitationResult> {
    const email = dto.email;

    await this.validateOrganizationExists(organizationId);

    await this.validateUserIsAdminOrOwner(organizationId, userId);

    await this.validateEmailNotMember(organizationId, email);

    await this.validateNoPendingInvitation(organizationId, email);

    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = this.getExpirationDate();

    const invitation = await this.createInvitationWithAudit(
      organizationId,
      email,
      dto.role,
      userId,
      tokenHash,
      expiresAt,
    );

    return {
      invitation: InvitationMapper.toResponse(invitation),
      token,
    };
  }

  async accept(
    currentUser: JwtPayload,
    dto: AcceptInvitationDto,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.findPendingInvitationByToken(dto.token);

    this.validateInvitationNotExpired(invitation);
    this.validateInvitationMatchesUser(invitation, currentUser);

    await this.validateUserNotAlreadyMember(
      invitation.organizationId,
      currentUser.sub,
    );

    await this.acceptInvitationWithAudit(invitation, currentUser.sub);

    const acceptedInvitation = await this.prisma.invitation.findUniqueOrThrow({
      where: {
        id: invitation.id,
      },
    });

    return InvitationMapper.toResponse(acceptedInvitation);
  }
}
