import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { UpdateMembershipRoleDto } from '../dto/update-membership-role.dto';
import { MembershipResponse } from '../interfaces/membership-response.interface';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll(
    user: JwtPayload,
  ): Promise<MembershipResponse[]> {
    return this.prisma.membership.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(
    user: JwtPayload,
    membershipId: string,
  ): Promise<MembershipResponse> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found.');
    }

    return membership;
  }

  async updateRole(
    currentUser: JwtPayload,
    membershipId: string,
    dto: UpdateMembershipRoleDto,
  ): Promise<MembershipResponse> {
    const actorMembership = await this.prisma.membership.findUnique({
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

    if (actorMembership.role !== MembershipRole.OWNER) {
      throw new ForbiddenException(
        'Only organization owners can update member roles.',
      );
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId: currentUser.organizationId,
      },
      include: {
        user: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found.');
    }

    if (membership.userId === currentUser.sub) {
      throw new BadRequestException(
        'You cannot change your own role.',
      );
    }

    if (membership.role === MembershipRole.OWNER) {
      throw new BadRequestException(
        'Owner role cannot be modified.',
      );
    }

    const updated = await this.prisma.membership.update({
      where: {
        id: membership.id,
      },
      data: {
        role: dto.role,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        },
      },
    });

    return updated;
  }

  async remove(
    currentUser: JwtPayload,
    membershipId: string,
  ): Promise<{ message: string }> {
    const actorMembership = await this.prisma.membership.findUnique({
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

    if (actorMembership.role !== MembershipRole.OWNER) {
      throw new ForbiddenException(
        'Only organization owners can remove members.',
      );
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId: currentUser.organizationId,
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found.');
    }

    if (membership.userId === currentUser.sub) {
      throw new BadRequestException(
        'You cannot remove yourself.',
      );
    }

    if (membership.role === MembershipRole.OWNER) {
      throw new BadRequestException(
        'Organization owner cannot be removed.',
      );
    }

    await this.prisma.membership.delete({
      where: {
        id: membership.id,
      },
    });

    return {
      message: 'Member removed successfully.',
    };
  }
}