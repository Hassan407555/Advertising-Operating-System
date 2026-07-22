import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  MembershipRole,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';

import {
  canAssignRole,
  canManageRole,
} from '../../auth/utils/role.utils';

import { MembershipResponseDto } from '../dto/membership-response.dto';
import { UpdateMembershipRoleDto } from '../dto/update-membership-role.dto';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(
    user: JwtPayload,
  ): Promise<MembershipResponseDto[]> {
    return this.prisma.membership.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        updatedAt: true,
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
  ): Promise<MembershipResponseDto> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        id: membershipId,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
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

    if (
      !membership ||
      membership.organizationId !== user.organizationId
    ) {
      throw new NotFoundException('Membership not found.');
    }

    const { organizationId, ...result } = membership;

    return result;
  }

  private async getCurrentMembership(user: JwtPayload) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: user.organizationId,
          userId: user.sub,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Membership not found.',
      );
    }

    return membership;
  }

  private async getMembershipOrThrow(
    membershipId: string,
    organizationId: string,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        id: membershipId,
      },
    });

    if (
      !membership ||
      membership.organizationId !== organizationId
    ) {
      throw new NotFoundException(
        'Membership not found.',
      );
    }

    return membership;
  }

  private async ensureLastOwnerProtection(
    organizationId: string,
    currentRole: MembershipRole,
    newRole?: MembershipRole,
  ) {
    if (currentRole !== MembershipRole.OWNER) {
      return;
    }

    if (
      newRole &&
      newRole === MembershipRole.OWNER
    ) {
      return;
    }

    const ownerCount =
      await this.prisma.membership.count({
        where: {
          organizationId,
          role: MembershipRole.OWNER,
        },
      });

    if (ownerCount <= 1) {
      throw new BadRequestException(
        'Cannot modify the last owner of the organization.',
      );
    }
  }
    async updateRole(
    currentUser: JwtPayload,
    membershipId: string,
    dto: UpdateMembershipRoleDto,
  ): Promise<MembershipResponseDto> {
    const actorMembership = await this.getCurrentMembership(currentUser);

    const membership = await this.getMembershipOrThrow(
      membershipId,
      currentUser.organizationId,
    );

    if (membership.userId === currentUser.sub) {
      throw new BadRequestException(
        'You cannot change your own role.',
      );
    }

    if (
      !canManageRole(actorMembership.role, membership.role)
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage this member.',
      );
    }

    if (
      !canAssignRole(actorMembership.role, dto.role)
    ) {
      throw new ForbiddenException(
        'You do not have permission to assign this role.',
      );
    }

    await this.ensureLastOwnerProtection(
      currentUser.organizationId,
      membership.role,
      dto.role,
    );

    const updatedMembership =
      await this.prisma.membership.update({
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
          updatedAt: true,
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

    await this.auditLogsService.log({
      organizationId: currentUser.organizationId,
      actorId: currentUser.sub,
      action: AuditAction.MEMBERSHIP_ROLE_UPDATED,
      entity: AuditEntity.MEMBERSHIP,
      entityId: membership.id,
      metadata: {
        previousRole: membership.role,
        newRole: dto.role,
        updatedUserId: membership.userId,
      },
    });

    return updatedMembership;
  }
    async remove(
    currentUser: JwtPayload,
    membershipId: string,
  ): Promise<{ message: string }> {
    const actorMembership = await this.getCurrentMembership(currentUser);

    const membership = await this.getMembershipOrThrow(
      membershipId,
      currentUser.organizationId,
    );

    if (membership.userId === currentUser.sub) {
      throw new BadRequestException(
        'You cannot remove yourself.',
      );
    }

    if (
      !canManageRole(actorMembership.role, membership.role)
    ) {
      throw new ForbiddenException(
        'You do not have permission to remove this member.',
      );
    }

    await this.ensureLastOwnerProtection(
      currentUser.organizationId,
      membership.role,
    );

    await this.prisma.membership.delete({
      where: {
        id: membership.id,
      },
    });

    await this.auditLogsService.log({
      organizationId: currentUser.organizationId,
      actorId: currentUser.sub,
      action: AuditAction.MEMBERSHIP_REMOVED,
      entity: AuditEntity.MEMBERSHIP,
      entityId: membership.id,
      metadata: {
        removedUserId: membership.userId,
        removedRole: membership.role,
      },
    });

    return {
      message: 'Member removed successfully.',
    };
  }
}