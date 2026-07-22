import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { MembershipRole, Prisma } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { MemberResponseDto } from '../dto/member-response.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

import { canManageRole, canAssignRole } from '../../auth/utils/role.utils';

// Type definitions for Prisma include payloads
type MembershipWithUser = Prisma.MembershipGetPayload<{
  include: { user: true };
}>;

type MembershipWithUserSelect = Prisma.MembershipGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
        avatarUrl: true;
        status: true;
      };
    };
  };
}>;

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(user: JwtPayload) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: {
        memberships: {
          where: { userId: user.sub },
          select: { role: true },
          take: 1,
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      membershipRole: organization.memberships[0]?.role ?? null,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  async updateCurrent(user: JwtPayload, dto: UpdateOrganizationDto) {
    try {
      return await this.prisma.organization.update({
        where: { id: user.organizationId },
        data: dto,
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Organization slug already exists.');
      }
      throw error;
    }
  }

  async listMembers(user: JwtPayload): Promise<MemberResponseDto[]> {
    const members = await this.prisma.membership.findMany({
      where: { organizationId: user.organizationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((member) => this.toMemberResponseDto(member));
  }

  async updateMemberRole(
    currentUser: JwtPayload,
    membershipId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<MemberResponseDto> {
    // Fetch target membership and current user role in parallel for performance
    const [targetMembership, currentUserRole] = await Promise.all([
      this.getMembershipWithUserOrThrow(
        membershipId,
        currentUser.organizationId,
      ),
      this.getMembershipRoleOrThrow(
        currentUser.sub,
        currentUser.organizationId,
      ),
    ]);

    this.assertNotSelfOperation(targetMembership.userId, currentUser.sub);

    // Assert that we're not demoting the last owner
    await this.assertNotDemotingLastOwner(
      currentUser.organizationId,
      targetMembership.role,
      dto.role,
    );

    this.assertCanUpdateRole(currentUserRole, targetMembership.role, dto.role);

    const updatedMembership = await this.prisma.membership.update({
      where: { id: targetMembership.id },
      data: { role: dto.role },
      include: { user: true },
    });

    return this.toMemberResponseDto(updatedMembership);
  }

  async removeMember(
    currentUser: JwtPayload,
    membershipId: string,
  ): Promise<void> {
    const targetMembership = await this.getMembershipOrThrow(
      membershipId,
      currentUser.organizationId,
    );

    this.assertNotSelfOperation(targetMembership.userId, currentUser.sub);

    await this.assertNotRemovingLastOwner(
      currentUser.organizationId,
      targetMembership.role,
    );

    const currentUserRole = await this.getMembershipRoleOrThrow(
      currentUser.sub,
      currentUser.organizationId,
    );

    this.assertCanRemoveMember(currentUserRole, targetMembership.role);

    await this.prisma.membership.delete({
      where: { id: targetMembership.id },
    });
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Get a membership by ID and verify it belongs to the organization
   * Uses findUnique with primary key for optimal performance
   */
  private async getMembershipOrThrow(
    membershipId: string,
    organizationId: string,
  ): Promise<Prisma.MembershipGetPayload<{}>> {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found.');
    }

    // Explicit tenant boundary validation
    if (membership.organizationId !== organizationId) {
      throw new NotFoundException('Membership not found.');
    }

    return membership;
  }

  /**
   * Get a membership with user data and verify it belongs to the organization
   */
  private async getMembershipWithUserOrThrow(
    membershipId: string,
    organizationId: string,
  ): Promise<MembershipWithUser> {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: { user: true },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found.');
    }

    // Explicit tenant boundary validation
    if (membership.organizationId !== organizationId) {
      throw new NotFoundException('Membership not found.');
    }

    return membership;
  }

  /**
   * Get the current user's role in the organization
   * Uses the compound unique constraint (organizationId, userId)
   */
  private async getMembershipRoleOrThrow(
    userId: string,
    organizationId: string,
  ): Promise<MembershipRole> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      throw new NotFoundException('User membership not found.');
    }

    return membership.role;
  }

  private assertNotSelfOperation(
    targetUserId: string,
    currentUserId: string,
  ): void {
    if (targetUserId === currentUserId) {
      throw new BadRequestException(
        'You cannot perform this action on your own membership.',
      );
    }
  }

  private async assertNotRemovingLastOwner(
    organizationId: string,
    targetRole: MembershipRole,
  ): Promise<void> {
    if (targetRole !== MembershipRole.OWNER) {
      return;
    }

    const ownerCount = await this.prisma.membership.count({
      where: {
        organizationId,
        role: MembershipRole.OWNER,
      },
    });

    if (ownerCount <= 1) {
      throw new BadRequestException(
        'Cannot remove the last owner of the organization.',
      );
    }
  }

  private async assertNotDemotingLastOwner(
    organizationId: string,
    targetCurrentRole: MembershipRole,
    targetNewRole: MembershipRole,
  ): Promise<void> {
    // Only check if we're demoting an OWNER
    if (targetCurrentRole !== MembershipRole.OWNER) {
      return;
    }

    // If the new role is also OWNER, no demotion is happening
    if (targetNewRole === MembershipRole.OWNER) {
      return;
    }

    // Count total owners in the organization
    const ownerCount = await this.prisma.membership.count({
      where: {
        organizationId,
        role: MembershipRole.OWNER,
      },
    });

    // If this is the only owner, prevent demotion
    if (ownerCount <= 1) {
      throw new BadRequestException(
        'Cannot demote the last owner of the organization.',
      );
    }
  }

  private assertCanUpdateRole(
    actorRole: MembershipRole,
    targetCurrentRole: MembershipRole,
    targetNewRole: MembershipRole,
  ): void {
    if (!canManageRole(actorRole, targetCurrentRole)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }

    if (!canAssignRole(actorRole, targetNewRole)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }
  }

  private assertCanRemoveMember(
    actorRole: MembershipRole,
    targetRole: MembershipRole,
  ): void {
    if (!canManageRole(actorRole, targetRole)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }
  }

  private toMemberResponseDto(
    membership: MembershipWithUserSelect | MembershipWithUser,
  ): MemberResponseDto {
    return {
      membershipId: membership.id,
      role: membership.role,
      joinedAt: membership.createdAt,
      user: {
        id: membership.user.id,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        email: membership.user.email,
        avatarUrl: membership.user.avatarUrl,
        status: membership.user.status,
      },
    };
  }
}
