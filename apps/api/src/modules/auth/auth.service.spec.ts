import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditAction, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

import { EMAIL_SERVICE } from '../../infrastructure/email/email.tokens';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/services/audit-logs.service';
import { AuthService } from './services/auth.service';

describe('AuthService password reset', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const emailService = {
    send: jest.fn(),
  };

  const auditLogsService = {
    log: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'WEB_APP_URL') {
        return 'http://localhost:3000';
      }
      if (key === 'CORS_ORIGIN') {
        return 'http://localhost:3000';
      }
      return undefined;
    }),
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    configService.get.mockImplementation((key: string) => {
      if (key === 'WEB_APP_URL') {
        return 'http://localhost:3000';
      }
      if (key === 'CORS_ORIGIN') {
        return 'http://localhost:3000';
      }
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: configService },
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: EMAIL_SERVICE, useValue: emailService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('forgotPassword', () => {
    it('returns a generic message when the email is unknown', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'missing@example.com',
      });

      expect(result.data.message).toBe(
        'If an account exists, a reset email has been sent.',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('stores a hashed token, emails the reset link, and audits', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'owner@example.com',
        status: UserStatus.ACTIVE,
        memberships: [{ organizationId: 'org-1' }],
      });
      prisma.user.update.mockResolvedValue({});
      emailService.send.mockResolvedValue(undefined);
      auditLogsService.log.mockResolvedValue({});

      const result = await service.forgotPassword({
        email: 'Owner@Example.com',
      });

      expect(result.data.message).toBe(
        'If an account exists, a reset email has been sent.',
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            passwordResetTokenHash: expect.any(String),
            passwordResetExpiresAt: expect.any(Date),
          }),
        }),
      );

      const storedHash = prisma.user.update.mock.calls[0][0].data
        .passwordResetTokenHash as string;
      expect(storedHash).toHaveLength(64);

      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'owner@example.com',
          subject: 'Reset your password',
          text: expect.stringContaining(
            'http://localhost:3000/reset-password?token=',
          ),
        }),
      );

      const emailText = emailService.send.mock.calls[0][0].text as string;
      const tokenMatch = emailText.match(/token=([a-f0-9]+)/);
      expect(tokenMatch?.[1]).toBeDefined();
      expect(createHash('sha256').update(tokenMatch![1]).digest('hex')).toBe(
        storedHash,
      );

      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PASSWORD_RESET_REQUESTED,
          organizationId: 'org-1',
          actorId: 'user-1',
        }),
        undefined,
      );
    });
  });

  describe('resetPassword', () => {
    const rawToken = 'a'.repeat(64);
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    it('rejects invalid tokens', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: rawToken,
          newPassword: 'NewPassword1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects expired tokens', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'owner@example.com',
        status: UserStatus.ACTIVE,
        passwordResetExpiresAt: new Date(Date.now() - 60_000),
        memberships: [{ organizationId: 'org-1' }],
      });

      await expect(
        service.resetPassword({
          token: rawToken,
          newPassword: 'NewPassword1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates the password, invalidates the token, and rejects reuse', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'owner@example.com',
          status: UserStatus.ACTIVE,
          passwordResetExpiresAt: new Date(Date.now() + 30 * 60_000),
          memberships: [{ organizationId: 'org-1' }],
        })
        .mockResolvedValueOnce(null);

      prisma.user.update.mockResolvedValue({});
      auditLogsService.log.mockResolvedValue({});

      const result = await service.resetPassword({
        token: rawToken,
        newPassword: 'NewPassword1',
      });

      expect(result.data.message).toContain('Password has been reset');

      const updateData = prisma.user.update.mock.calls[0][0].data;
      expect(updateData.passwordResetTokenHash).toBeNull();
      expect(updateData.passwordResetExpiresAt).toBeNull();
      expect(updateData.refreshTokenHash).toBeNull();
      expect(await bcrypt.compare('NewPassword1', updateData.passwordHash)).toBe(
        true,
      );

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { passwordResetTokenHash: tokenHash },
        }),
      );

      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PASSWORD_RESET_COMPLETED,
        }),
        undefined,
      );

      await expect(
        service.resetPassword({
          token: rawToken,
          newPassword: 'AnotherPass1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects inactive users', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'owner@example.com',
        status: UserStatus.INACTIVE,
        passwordResetExpiresAt: new Date(Date.now() + 30 * 60_000),
        memberships: [{ organizationId: 'org-1' }],
      });

      await expect(
        service.resetPassword({
          token: rawToken,
          newPassword: 'NewPassword1',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
