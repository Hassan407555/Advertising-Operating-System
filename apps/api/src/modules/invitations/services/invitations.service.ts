import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  AuditEntity,
  Invitation,
  InvitationStatus,
  MembershipRole,
  Prisma,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

import { INVITATION_EMAIL_SERVICE } from '../../../infrastructure/email/email.tokens';
import type { InvitationEmailService } from '../../../infrastructure/email/interfaces/invitation-email.service.interface';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import {
  CreateInvitationResultDto,
  InvitationResponseDto,
} from '../dto/invitation-response.dto';
import { InvitationMapper } from '../mappers/invitation.mapper';

type InvitationWithCreator = Invitation & {
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private static readonly TOKEN_BYTES = 32;
  private static readonly DEFAULT_EXPIRY_HOURS = 168;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(INVITATION_EMAIL_SERVICE)
    private readonly invitationEmailService: InvitationEmailService,
  ) {}

  private generateToken(): string {
    return randomBytes(InvitationsService.TOKEN_BYTES).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getExpirationDate(): Date {
    const raw = this.configService.get<number | string>(
      'INVITATION_EXPIRATION_HOURS',
    );
    const parsed = Number(raw);
    const hours =
      Number.isFinite(parsed) && parsed > 0
        ? parsed
        : InvitationsService.DEFAULT_EXPIRY_HOURS;

    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private getWebAppUrl(): string {
    const explicit = this.configService.get<string>('WEB_APP_URL')?.trim();
    if (explicit) {
      return explicit.replace(/\/$/, '');
    }

    const corsOrigin = this.configService.get<string>('CORS_ORIGIN')?.trim();
    if (corsOrigin && corsOrigin !== '*') {
      const first = corsOrigin.split(',')[0]?.trim();
      if (first) {
        return first.replace(/\/$/, '');
      }
    }

    return 'http://localhost:3000';
  }

  private buildInvitationUrl(token: string): string {
    return `${this.getWebAppUrl()}/accept-invitation?token=${token}`;
  }

  private async deliverInvitationEmail(params: {
    to: string;
    organizationName: string;
    role: MembershipRole;
    invitationUrl: string;
    expiresAt: Date;
  }): Promise<boolean> {
    try {
      await this.invitationEmailService.sendInvitation(params);
      // LocalEmailProvider logs only — treat as not externally delivered.
      return false;
    } catch (error) {
      this.logger.warn(
        `Failed to deliver invitation email to ${params.to}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return false;
    }
  }

  private async getOrganizationName(organizationId: string): Promise<string> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    return organization?.name ?? 'your organization';
  }

  private creatorInclude() {
    return {
      createdByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    } as const;
  }

  private resolveEffectiveStatus(
    invitation: Invitation,
  ): InvitationStatus {
    if (
      invitation.status === InvitationStatus.PENDING &&
      invitation.expiresAt < new Date()
    ) {
      return InvitationStatus.EXPIRED;
    }

    return invitation.status;
  }

  private toMappedResponse(
    invitation: InvitationWithCreator,
  ): InvitationResponseDto {
    const effectiveStatus = this.resolveEffectiveStatus(invitation);
    return InvitationMapper.toResponse({
      ...invitation,
      status: effectiveStatus,
    });
  }

  private async markExpiredIfNeeded(
    invitation: Invitation,
  ): Promise<Invitation> {
    if (
      invitation.status !== InvitationStatus.PENDING ||
      invitation.expiresAt >= new Date()
    ) {
      return invitation;
    }

    return this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.EXPIRED },
    });
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
        'Only organization owners and admins can manage invitations.',
      );
    }
  }

  private async validateNotSelfInvite(
    userId: string,
    email: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (user && user.email.toLowerCase() === email.toLowerCase()) {
      throw new BadRequestException('You cannot invite yourself.');
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
    excludeInvitationId?: string,
  ): Promise<void> {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        organizationId,
        email,
        status: InvitationStatus.PENDING,
        ...(excludeInvitationId
          ? { id: { not: excludeInvitationId } }
          : {}),
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });

    if (!invitation) {
      return;
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      return;
    }

    throw new ConflictException(
      'A pending invitation already exists for this email.',
    );
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

    const maybeExpired = await this.markExpiredIfNeeded(invitation);

    if (maybeExpired.status !== InvitationStatus.PENDING) {
      throw new ConflictException('This invitation is no longer available.');
    }

    return maybeExpired;
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

  private async findOrganizationInvitationOrThrow(
    organizationId: string,
    invitationId: string,
  ): Promise<InvitationWithCreator> {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
      },
      include: this.creatorInclude(),
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    return invitation;
  }

  private async createInvitationWithAudit(
    organizationId: string,
    email: string,
    role: MembershipRole,
    createdByUserId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<InvitationWithCreator> {
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
          include: this.creatorInclude(),
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
  ): Promise<CreateInvitationResultDto> {
    const email = dto.email;

    await this.validateOrganizationExists(organizationId);
    await this.validateUserIsAdminOrOwner(organizationId, userId);
    await this.validateNotSelfInvite(userId, email);
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

    const invitationUrl = this.buildInvitationUrl(token);
    const organizationName = await this.getOrganizationName(organizationId);
    const emailSent = await this.deliverInvitationEmail({
      to: email,
      organizationName,
      role: dto.role,
      invitationUrl,
      expiresAt,
    });

    return {
      invitation: this.toMappedResponse(invitation),
      token,
      invitationUrl,
      emailSent,
    };
  }

  async list(
    organizationId: string,
    userId: string,
  ): Promise<InvitationResponseDto[]> {
    await this.validateOrganizationExists(organizationId);
    await this.validateUserIsAdminOrOwner(organizationId, userId);

    const invitations = await this.prisma.invitation.findMany({
      where: { organizationId },
      include: this.creatorInclude(),
      orderBy: { createdAt: 'desc' },
    });

    const expiredIds = invitations
      .filter(
        (invitation) =>
          invitation.status === InvitationStatus.PENDING &&
          invitation.expiresAt < new Date(),
      )
      .map((invitation) => invitation.id);

    if (expiredIds.length > 0) {
      await this.prisma.invitation.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: InvitationStatus.EXPIRED },
      });
    }

    return invitations.map((invitation) =>
      this.toMappedResponse({
        ...invitation,
        status: expiredIds.includes(invitation.id)
          ? InvitationStatus.EXPIRED
          : invitation.status,
      }),
    );
  }

  async revoke(
    organizationId: string,
    userId: string,
    invitationId: string,
  ): Promise<InvitationResponseDto> {
    await this.validateOrganizationExists(organizationId);
    await this.validateUserIsAdminOrOwner(organizationId, userId);

    const invitation = await this.findOrganizationInvitationOrThrow(
      organizationId,
      invitationId,
    );
    const current = await this.markExpiredIfNeeded(invitation);

    if (current.status !== InvitationStatus.PENDING) {
      throw new ConflictException(
        'Only pending invitations can be revoked.',
      );
    }

    const revoked = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.invitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.REVOKED },
        include: this.creatorInclude(),
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorId: userId,
          action: AuditAction.INVITATION_REVOKED,
          entity: AuditEntity.INVITATION,
          entityId: invitationId,
          metadata: {
            email: updated.email,
            role: updated.role,
          },
        },
      });

      return updated;
    });

    return this.toMappedResponse(revoked);
  }

  async resend(
    organizationId: string,
    userId: string,
    invitationId: string,
  ): Promise<CreateInvitationResultDto> {
    await this.validateOrganizationExists(organizationId);
    await this.validateUserIsAdminOrOwner(organizationId, userId);

    const invitation = await this.findOrganizationInvitationOrThrow(
      organizationId,
      invitationId,
    );
    const current = await this.markExpiredIfNeeded(invitation);

    if (
      current.status !== InvitationStatus.PENDING &&
      current.status !== InvitationStatus.EXPIRED
    ) {
      throw new ConflictException(
        'Only pending or expired invitations can be resent.',
      );
    }

    await this.validateEmailNotMember(organizationId, current.email);
    await this.validateNoPendingInvitation(
      organizationId,
      current.email,
      current.id,
    );

    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = this.getExpirationDate();

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.invitation.update({
        where: { id: current.id },
        data: {
          tokenHash,
          expiresAt,
          status: InvitationStatus.PENDING,
          acceptedAt: null,
        },
        include: this.creatorInclude(),
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorId: userId,
          action: AuditAction.INVITATION_RESENT,
          entity: AuditEntity.INVITATION,
          entityId: current.id,
          metadata: {
            email: next.email,
            role: next.role,
            expiresAt: next.expiresAt,
          },
        },
      });

      return next;
    });

    const invitationUrl = this.buildInvitationUrl(token);
    const organizationName = await this.getOrganizationName(organizationId);
    const emailSent = await this.deliverInvitationEmail({
      to: updated.email,
      organizationName,
      role: updated.role,
      invitationUrl,
      expiresAt,
    });

    return {
      invitation: this.toMappedResponse(updated),
      token,
      invitationUrl,
      emailSent,
    };
  }

  /**
   * Rotates the invitation token and returns a fresh accept URL.
   * Previous links stop working. Does not send email.
   */
  async regenerateLink(
    organizationId: string,
    userId: string,
    invitationId: string,
  ): Promise<CreateInvitationResultDto> {
    await this.validateOrganizationExists(organizationId);
    await this.validateUserIsAdminOrOwner(organizationId, userId);

    const invitation = await this.findOrganizationInvitationOrThrow(
      organizationId,
      invitationId,
    );
    const current = await this.markExpiredIfNeeded(invitation);

    if (current.status !== InvitationStatus.PENDING) {
      throw new ConflictException(
        'Only pending invitations have an active invitation link.',
      );
    }

    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = this.getExpirationDate();

    const updated = await this.prisma.invitation.update({
      where: { id: current.id },
      data: {
        tokenHash,
        expiresAt,
      },
      include: this.creatorInclude(),
    });

    return {
      invitation: this.toMappedResponse(updated),
      token,
      invitationUrl: this.buildInvitationUrl(token),
      emailSent: false,
    };
  }

  async remove(
    organizationId: string,
    userId: string,
    invitationId: string,
  ): Promise<{ message: string }> {
    await this.validateOrganizationExists(organizationId);
    await this.validateUserIsAdminOrOwner(organizationId, userId);

    const invitation = await this.findOrganizationInvitationOrThrow(
      organizationId,
      invitationId,
    );

    if (invitation.status !== InvitationStatus.REVOKED) {
      throw new ConflictException(
        'Only revoked invitations can be deleted.',
      );
    }

    await this.prisma.invitation.delete({
      where: { id: invitationId },
    });

    return { message: 'Invitation deleted.' };
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
      include: this.creatorInclude(),
    });

    return this.toMappedResponse(acceptedInvitation);
  }
}
