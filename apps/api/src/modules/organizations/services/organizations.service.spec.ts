import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MembershipRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService members', () => {
  let service: OrganizationsService;

  const prisma = {
    membership: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const owner: JwtPayload = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(OrganizationsService);
  });

  describe('updateMemberRole', () => {
    it('updates role and writes audit log', async () => {
      prisma.membership.findUnique
        .mockResolvedValueOnce({
          id: 'mem-2',
          organizationId: 'org-1',
          userId: 'user-2',
          role: MembershipRole.MEMBER,
          user: {
            id: 'user-2',
            firstName: 'Teammate',
            lastName: 'One',
            email: 'teammate@example.com',
            avatarUrl: null,
            status: UserStatus.ACTIVE,
            lastLoginAt: null,
          },
        })
        .mockResolvedValueOnce({ role: MembershipRole.OWNER });

      prisma.membership.update.mockResolvedValue({
        id: 'mem-2',
        organizationId: 'org-1',
        userId: 'user-2',
        role: MembershipRole.ADMIN,
        createdAt: new Date(),
        user: {
          id: 'user-2',
          firstName: 'Teammate',
          lastName: 'One',
          email: 'teammate@example.com',
          avatarUrl: null,
          status: UserStatus.ACTIVE,
          lastLoginAt: null,
        },
      });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.updateMemberRole(owner, 'mem-2', {
        role: MembershipRole.ADMIN,
      });

      expect(result.role).toBe(MembershipRole.ADMIN);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('blocks changing your own role', async () => {
      prisma.membership.findUnique
        .mockResolvedValueOnce({
          id: 'mem-1',
          organizationId: 'org-1',
          userId: 'owner-1',
          role: MembershipRole.OWNER,
          user: {
            id: 'owner-1',
            firstName: 'Own',
            lastName: 'Er',
            email: 'owner@example.com',
            avatarUrl: null,
            status: UserStatus.ACTIVE,
            lastLoginAt: null,
          },
        })
        .mockResolvedValueOnce({ role: MembershipRole.OWNER });

      await expect(
        service.updateMemberRole(owner, 'mem-1', {
          role: MembershipRole.ADMIN,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('removeMember', () => {
    it('removes a member and writes audit log', async () => {
      prisma.membership.findUnique
        .mockResolvedValueOnce({
          id: 'mem-2',
          organizationId: 'org-1',
          userId: 'user-2',
          role: MembershipRole.MEMBER,
        })
        .mockResolvedValueOnce({ role: MembershipRole.OWNER });
      prisma.auditLog.create.mockResolvedValue({});
      prisma.membership.delete.mockResolvedValue({});

      await service.removeMember(owner, 'mem-2');

      expect(prisma.membership.delete).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('blocks removing yourself', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'owner-1',
        role: MembershipRole.OWNER,
      });

      await expect(service.removeMember(owner, 'mem-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('blocks admin from removing an owner', async () => {
      const admin: JwtPayload = {
        ...owner,
        sub: 'admin-1',
        role: MembershipRole.ADMIN,
      };

      prisma.membership.findUnique
        .mockResolvedValueOnce({
          id: 'mem-owner',
          organizationId: 'org-1',
          userId: 'owner-1',
          role: MembershipRole.OWNER,
        })
        .mockResolvedValueOnce({ role: MembershipRole.ADMIN });

      await expect(
        service.removeMember(admin, 'mem-owner'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
