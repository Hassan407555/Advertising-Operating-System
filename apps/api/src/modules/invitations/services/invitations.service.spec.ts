import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  InvitationStatus,
  MembershipRole,
} from '@prisma/client';
import { createHash } from 'crypto';

import { INVITATION_EMAIL_SERVICE } from '../../../infrastructure/email/email.tokens';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  let service: InvitationsService;

  const invitationEmailService = {
    sendInvitation: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'WEB_APP_URL') {
        return 'http://localhost:3000';
      }
      if (key === 'INVITATION_EXPIRATION_HOURS') {
        return 168;
      }
      return undefined;
    }),
  };

  const prisma = {
    organization: {
      findUnique: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    invitation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const ownerUser: JwtPayload = {
    sub: 'owner-1',
    email: 'owner@example.com',
    organizationId: 'org-1',
    role: MembershipRole.OWNER,
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) =>
      callback(prisma),
    );

    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
    });
    prisma.membership.findUnique.mockResolvedValue({
      role: MembershipRole.OWNER,
    });
    invitationEmailService.sendInvitation.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        { provide: INVITATION_EMAIL_SERVICE, useValue: invitationEmailService },
      ],
    }).compile();

    service = module.get(InvitationsService);
  });

  function hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  describe('create', () => {
    it('creates an invitation, logs email, and returns accept-invitation URL', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ email: 'owner@example.com' })
        .mockResolvedValueOnce(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-1',
        email: 'teammate@example.com',
        role: MembershipRole.MEMBER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdByUser: {
          id: 'owner-1',
          firstName: 'Own',
          lastName: 'Er',
          email: 'owner@example.com',
        },
      });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.create('org-1', 'owner-1', {
        email: 'teammate@example.com',
        role: MembershipRole.MEMBER,
      });

      expect(result.invitation.email).toBe('teammate@example.com');
      expect(result.invitationUrl).toContain('/accept-invitation?token=');
      expect(result.token.length).toBeGreaterThan(10);
      expect(invitationEmailService.sendInvitation).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('blocks duplicate pending invitations', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ email: 'owner@example.com' })
        .mockResolvedValueOnce(null);
      prisma.invitation.findFirst.mockResolvedValue({
        id: 'inv-existing',
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.create('org-1', 'owner-1', {
          email: 'teammate@example.com',
          role: MembershipRole.MEMBER,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('blocks inviting an existing member', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ email: 'owner@example.com' })
        .mockResolvedValueOnce({ id: 'user-2' });
      prisma.membership.findUnique
        .mockResolvedValueOnce({ role: MembershipRole.OWNER })
        .mockResolvedValueOnce({ id: 'mem-2' });

      await expect(
        service.create('org-1', 'owner-1', {
          email: 'member@example.com',
          role: MembershipRole.MEMBER,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('accept', () => {
    it('accepts a valid pending invitation', async () => {
      const token = 'a'.repeat(64);
      const pending = {
        id: 'inv-1',
        organizationId: 'org-1',
        email: 'invitee@example.com',
        role: MembershipRole.MEMBER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
        tokenHash: hashToken(token),
      };

      prisma.invitation.findUnique.mockResolvedValue(pending);
      prisma.membership.findUnique.mockResolvedValue(null);
      prisma.membership.create.mockResolvedValue({});
      prisma.invitation.update.mockResolvedValue({
        ...pending,
        status: InvitationStatus.ACCEPTED,
      });
      prisma.auditLog.create.mockResolvedValue({});
      prisma.invitation.findUniqueOrThrow.mockResolvedValue({
        ...pending,
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const invitee: JwtPayload = {
        sub: 'user-2',
        email: 'invitee@example.com',
        organizationId: 'other-org',
        role: MembershipRole.OWNER,
      };

      const result = await service.accept(invitee, { token });
      expect(result.status).toBe(InvitationStatus.ACCEPTED);
      expect(prisma.membership.create).toHaveBeenCalled();
    });

    it('rejects expired invitations', async () => {
      const token = 'b'.repeat(64);
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-1',
        email: 'invitee@example.com',
        role: MembershipRole.MEMBER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() - 1000),
        tokenHash: hashToken(token),
      });
      prisma.invitation.update.mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.EXPIRED,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.accept(
          {
            sub: 'user-2',
            email: 'invitee@example.com',
            organizationId: 'org-1',
            role: MembershipRole.OWNER,
          },
          { token },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects revoked invitations', async () => {
      const token = 'c'.repeat(64);
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-1',
        email: 'invitee@example.com',
        role: MembershipRole.MEMBER,
        status: InvitationStatus.REVOKED,
        expiresAt: new Date(Date.now() + 60_000),
        tokenHash: hashToken(token),
      });

      await expect(
        service.accept(
          {
            sub: 'user-2',
            email: 'invitee@example.com',
            organizationId: 'org-1',
            role: MembershipRole.OWNER,
          },
          { token },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when invitee is already a member', async () => {
      const token = 'd'.repeat(64);
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-1',
        email: 'invitee@example.com',
        role: MembershipRole.MEMBER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
        tokenHash: hashToken(token),
      });
      prisma.membership.findUnique.mockResolvedValue({ id: 'mem-1' });

      await expect(
        service.accept(
          {
            sub: 'user-2',
            email: 'invitee@example.com',
            organizationId: 'org-1',
            role: MembershipRole.OWNER,
          },
          { token },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects invalid tokens', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.accept(ownerUser, { token: 'missing-token' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('revoke', () => {
    it('revokes a pending invitation', async () => {
      prisma.invitation.findFirst.mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-1',
        email: 'teammate@example.com',
        role: MembershipRole.MEMBER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.invitation.update.mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-1',
        email: 'teammate@example.com',
        role: MembershipRole.MEMBER,
        status: InvitationStatus.REVOKED,
        expiresAt: new Date(Date.now() + 60_000),
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.revoke('org-1', 'owner-1', 'inv-1');
      expect(result.status).toBe(InvitationStatus.REVOKED);
    });
  });

  describe('permissions', () => {
    it('forbids non-admin creators', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        role: MembershipRole.MEMBER,
      });

      await expect(
        service.create('org-1', 'member-1', {
          email: 'teammate@example.com',
          role: MembershipRole.MEMBER,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('blocks self-invite', async () => {
      prisma.user.findUnique.mockResolvedValue({
        email: 'owner@example.com',
      });

      await expect(
        service.create('org-1', 'owner-1', {
          email: 'owner@example.com',
          role: MembershipRole.MEMBER,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
