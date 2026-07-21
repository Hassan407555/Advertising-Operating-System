import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { MembershipRole } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { InvitationResponse } from '../interfaces/invitation-response.interface';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  async findAll(
    currentUser: JwtPayload,
  ): Promise<InvitationResponse[]> {
    return this.prisma.invitation.findMany({
      where: {
        organizationId: currentUser.organizationId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(
    currentUser: JwtPayload,
    dto: CreateInvitationDto,
  ): Promise<{
    invitation: InvitationResponse;
    token: string;
  }> {
    const actorMembership =
      await this.prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: currentUser.organizationId,
            userId: currentUser.sub,
          },
        },
      });

    if (!actorMembership) {
      throw new ForbiddenException();
    }

    if (
      actorMembership.role !== MembershipRole.OWNER &&
      actorMembership.role !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to invite members.',
      );
    }

    const existingInvitation =
      await this.prisma.invitation.findFirst({
        where: {
          organizationId: currentUser.organizationId,
          email: dto.email,
          acceptedAt: null,
        },
      });

    if (existingInvitation) {
      throw new BadRequestException(
        'A pending invitation already exists for this email.',
      );
    }

    const existingMembership =
      await this.prisma.membership.findFirst({
        where: {
          organizationId: currentUser.organizationId,
          user: {
            email: dto.email,
          },
        },
      });

    if (existingMembership) {
      throw new BadRequestException(
        'User is already a member of this organization.',
      );
    }

    const token = this.generateToken();

    const invitation =
      await this.prisma.invitation.create({
        data: {
          organizationId: currentUser.organizationId,
          email: dto.email,
          role: dto.role,
          tokenHash: this.hashToken(token),
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ),
          createdBy: currentUser.sub,
        },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          acceptedAt: true,
          createdAt: true,
        },
      });

    return {
      invitation,
      token,
    };
  }
    async remove(
    currentUser: JwtPayload,
    invitationId: string,
  ): Promise<{ message: string }> {
    const actorMembership =
      await this.prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: currentUser.organizationId,
            userId: currentUser.sub,
          },
        },
      });

    if (!actorMembership) {
      throw new ForbiddenException();
    }

    if (
      actorMembership.role !== MembershipRole.OWNER &&
      actorMembership.role !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to remove invitations.',
      );
    }

    const invitation =
      await this.prisma.invitation.findFirst({
        where: {
          id: invitationId,
          organizationId: currentUser.organizationId,
        },
      });

    if (!invitation) {
      throw new NotFoundException(
        'Invitation not found.',
      );
    }

    await this.prisma.invitation.delete({
      where: {
        id: invitation.id,
      },
    });

    return {
      message: 'Invitation deleted successfully.',
    };
  }

  async accept(
    dto: AcceptInvitationDto,
  ): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);

    const invitation =
      await this.prisma.invitation.findFirst({
        where: {
          tokenHash,
        },
      });

    if (!invitation) {
      throw new BadRequestException(
        'Invalid invitation token.',
      );
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException(
        'Invitation has already been accepted.',
      );
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException(
        'Invitation has expired.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: invitation.email,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'No user exists with this invitation email.',
      );
    }

    const existingMembership =
      await this.prisma.membership.findFirst({
        where: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      });

    if (existingMembership) {
      throw new BadRequestException(
        'User is already a member of this organization.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.membership.create({
        data: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
        },
      }),
      this.prisma.invitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          acceptedAt: new Date(),
        },
      }),
    ]);

    return {
      message: 'Invitation accepted successfully.',
    };
  }
}