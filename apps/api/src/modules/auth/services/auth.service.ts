import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import {
  AuditAction,
  AuditEntity,
  MembershipRole,
  Prisma,
  UserStatus,
} from '@prisma/client';

import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';

import { generateUniqueOrganizationSlug } from '../../../common/utils/slug.util';
import { EMAIL_SERVICE } from '../../../infrastructure/email/email.tokens';
import type { EmailService } from '../../../infrastructure/email/interfaces/email.service.interface';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';

import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { SwitchOrganizationDto } from '../dto/switch-organization.dto';

import { JwtPayload } from '../interfaces/jwt-payload.interface';

const BCRYPT_SALT_ROUNDS = 12;
const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_EXPIRY_MS = 30 * 60 * 1000;
const FORGOT_PASSWORD_RESPONSE_MESSAGE =
  'If an account exists, a reset email has been sent.';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuditLogParams = {
  organizationId: string;
  actorId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
};

type BuildAuthDataParams = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    createdAt: Date;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
  };
  membership: {
    id: string;
    role: MembershipRole;
  };
  tokens: AuthTokens;
};

type AuthDataResponse = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    createdAt: Date;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
  };
  membership: {
    id: string;
    role: MembershipRole;
  };
  tokens: AuthTokens;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const slug = await generateUniqueOrganizationSlug(
          tx,
          registerDto.organizationName,
        );

        const organization = await tx.organization.create({
          data: {
            name: registerDto.organizationName,
            slug,
          },
        });

        const userId = randomUUID();

        const tokens = await this.createTokens(
          userId,
          this.normalizeEmail(registerDto.email),
          organization.id,
          MembershipRole.OWNER,
        );

        const [passwordHash, refreshTokenHash] = await Promise.all([
          bcrypt.hash(registerDto.password, BCRYPT_SALT_ROUNDS),
          this.hashRefreshToken(tokens.refreshToken),
        ]);

        const user = await tx.user.create({
          data: {
            id: userId,
            email: this.normalizeEmail(registerDto.email),
            passwordHash,
            refreshTokenHash,
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
          },
        });

        const membership = await tx.membership.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: MembershipRole.OWNER,
          },
        });

        await Promise.all([
          this.logAudit(
            {
              organizationId: organization.id,
              actorId: user.id,
              action: AuditAction.USER_REGISTERED,
              entity: AuditEntity.USER,
              entityId: user.id,
              metadata: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
              },
            },
            tx,
          ),
          this.logAudit(
            {
              organizationId: organization.id,
              actorId: user.id,
              action: AuditAction.ORGANIZATION_CREATED,
              entity: AuditEntity.ORGANIZATION,
              entityId: organization.id,
              metadata: {
                name: organization.name,
                slug: organization.slug,
              },
            },
            tx,
          ),
          this.logAudit(
            {
              organizationId: organization.id,
              actorId: user.id,
              action: AuditAction.MEMBERSHIP_CREATED,
              entity: AuditEntity.MEMBERSHIP,
              entityId: membership.id,
              metadata: {
                role: membership.role,
              },
            },
            tx,
          ),
        ]);

        return {
          user,
          organization,
          membership,
          tokens,
        };
      });

      return {
        success: true,
        data: this.buildAuthData(result),
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException(this.getUniqueConstraintMessage(error));
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const email = this.normalizeEmail(loginDto.email);

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        memberships: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            organization: true,
          },
        },
      },
    });

    if (
      !user ||
      !(await bcrypt.compare(loginDto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive.');
    }

    // Login selects the earliest membership; callers can switch via
    // POST /auth/switch-organization after authentication.

    const membership = user.memberships[0];

    if (!membership) {
      throw new UnauthorizedException(
        'No organization membership is available for this user.',
      );
    }

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      membership.organizationId,
      membership.role,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logAudit({
      organizationId: membership.organizationId,
      actorId: user.id,
      action: AuditAction.USER_LOGGED_IN,
      entity: AuditEntity.USER,
      entityId: user.id,
      metadata: {
        email: user.email,
        organizationId: membership.organizationId,
      },
    });

    return {
      success: true,
      data: this.buildAuthData({
        user,
        organization: membership.organization,
        membership,
        tokens,
      }),
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        status: true,
        refreshTokenHash: true,
      },
    });

    if (
      !user?.refreshTokenHash ||
      !(await bcrypt.compare(refreshToken, user.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive.');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: payload.organizationId,
          userId: payload.sub,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new UnauthorizedException('Membership no longer exists.');
    }

    const tokens = await this.issueTokens(
      payload.sub,
      payload.email,
      payload.organizationId,
      membership.role,
    );

    await this.logAudit({
      organizationId: payload.organizationId,
      actorId: payload.sub,
      action: AuditAction.TOKEN_REFRESHED,
      entity: AuditEntity.USER,
      entityId: payload.sub,
    });

    return {
      success: true,
      data: {
        tokens,
      },
    };
  }

  async switchOrganization(
    userId: string,
    switchOrganizationDto: SwitchOrganizationDto,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: switchOrganizationDto.organizationId,
          userId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new UnauthorizedException(
        'You are not a member of this organization.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        email: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    const tokens = await this.issueTokens(
      userId,
      user.email,
      membership.organizationId,
      membership.role,
    );

    await this.logAudit({
      organizationId: membership.organizationId,
      actorId: userId,
      action: AuditAction.ORGANIZATION_SWITCHED,
      entity: AuditEntity.ORGANIZATION,
      entityId: membership.organizationId,
      metadata: {
        organizationName: membership.organization.name,
        role: membership.role,
      },
    });

    return {
      success: true,
      data: {
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
        },
        membership: {
          id: membership.id,
          role: membership.role,
        },
        tokens,
      },
    };
  }

  async logout(userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
      },
      select: {
        organizationId: true,
      },
    });

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshTokenHash: null,
      },
    });

    if (membership) {
      await this.logAudit({
        organizationId: membership.organizationId,
        actorId: userId,
        action: AuditAction.USER_LOGGED_OUT,
        entity: AuditEntity.USER,
        entityId: userId,
      });
    }

    return {
      success: true,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = this.normalizeEmail(forgotPasswordDto.email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        status: true,
        memberships: {
          orderBy: { createdAt: 'asc' },
          select: { organizationId: true },
          take: 1,
        },
      },
    });

    // Always return the same message to avoid account enumeration.
    if (!user || user.status !== UserStatus.ACTIVE) {
      return {
        success: true,
        data: { message: FORGOT_PASSWORD_RESPONSE_MESSAGE },
      };
    }

    const rawToken = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
    const passwordResetTokenHash = this.hashPasswordResetToken(rawToken);
    const passwordResetExpiresAt = new Date(
      Date.now() + PASSWORD_RESET_EXPIRY_MS,
    );

    // Invalidate any previous reset token by overwriting hash + expiry.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash,
        passwordResetExpiresAt,
      },
    });

    const resetUrl = `${this.getWebAppUrl()}/reset-password?token=${rawToken}`;

    await this.emailService.send({
      to: user.email,
      subject: 'Reset your password',
      text: [
        'You requested a password reset for AI Meta Ads Studio.',
        '',
        `Open this link to choose a new password (expires in 30 minutes):`,
        resetUrl,
        '',
        'If you did not request this, you can ignore this email.',
      ].join('\n'),
      html: `<p>You requested a password reset for AI Meta Ads Studio.</p><p><a href="${resetUrl}">Reset your password</a> (expires in 30 minutes).</p><p>If you did not request this, you can ignore this email.</p>`,
    });

    const organizationId = user.memberships[0]?.organizationId;
    if (organizationId) {
      await this.logAudit({
        organizationId,
        actorId: user.id,
        action: AuditAction.PASSWORD_RESET_REQUESTED,
        entity: AuditEntity.USER,
        entityId: user.id,
        metadata: {
          email: user.email,
          expiresAt: passwordResetExpiresAt.toISOString(),
        },
      });
    }

    return {
      success: true,
      data: { message: FORGOT_PASSWORD_RESPONSE_MESSAGE },
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const tokenHash = this.hashPasswordResetToken(resetPasswordDto.token);

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
      },
      select: {
        id: true,
        email: true,
        status: true,
        passwordResetExpiresAt: true,
        memberships: {
          orderBy: { createdAt: 'asc' },
          select: { organizationId: true },
          take: 1,
        },
      },
    });

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Password reset token is invalid or has expired.',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive.');
    }

    const passwordHash = await bcrypt.hash(
      resetPasswordDto.newPassword,
      BCRYPT_SALT_ROUNDS,
    );

    // Single-use: clear reset token; also revoke refresh sessions.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        refreshTokenHash: null,
      },
    });

    const organizationId = user.memberships[0]?.organizationId;
    if (organizationId) {
      await this.logAudit({
        organizationId,
        actorId: user.id,
        action: AuditAction.PASSWORD_RESET_COMPLETED,
        entity: AuditEntity.USER,
        entityId: user.id,
        metadata: {
          email: user.email,
        },
      });
    }

    this.logger.log(`Password reset completed for user ${user.id}`);

    return {
      success: true,
      data: {
        message: 'Password has been reset. You can now sign in.',
      },
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            id: true,
            organizationId: true,
            role: true,
            createdAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    const memberships = user.memberships.map((membership) => ({
      id: membership.id,
      organizationId: membership.organizationId,
      role: membership.role,
      createdAt: membership.createdAt,
    }));

    const organizations = user.memberships.map(
      ({ organization }) => organization,
    );

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        memberships,
        organizations,
      },
    };
  }

  // =====================================
  // Token Helpers
  // =====================================

  private async createTokens(
    userId: string,
    email: string,
    organizationId: string,
    role: MembershipRole,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      organizationId,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
        expiresIn: this.configService.getOrThrow('JWT_EXPIRES_IN'),
      }),

      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.getOrThrow('REFRESH_TOKEN_EXPIRES_IN'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async issueTokens(
    userId: string,
    email: string,
    organizationId: string,
    role: MembershipRole,
  ): Promise<AuthTokens> {
    const tokens = await this.createTokens(userId, email, organizationId, role);

    await this.saveRefreshTokenHash(userId, tokens.refreshToken);

    return tokens;
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  private async saveRefreshTokenHash(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshTokenHash: await this.hashRefreshToken(refreshToken),
      },
    });
  }

  private hashRefreshToken(refreshToken: string): Promise<string> {
    return bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);
  }

  // =====================================
  // Audit Helpers
  // =====================================

  private async logAudit(
    params: AuditLogParams,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.auditLogsService.log(params, tx);
  }

  // =====================================
  // Auth Helpers
  // =====================================

  private buildAuthData(params: BuildAuthDataParams): AuthDataResponse {
    return {
      user: {
        id: params.user.id,
        email: params.user.email,
        firstName: params.user.firstName,
        lastName: params.user.lastName,
        status: params.user.status,
        createdAt: params.user.createdAt,
      },
      organization: {
        id: params.organization.id,
        name: params.organization.name,
        slug: params.organization.slug,
        createdAt: params.organization.createdAt,
      },
      membership: {
        id: params.membership.id,
        role: params.membership.role,
      },
      tokens: params.tokens,
    };
  }

  // =====================================
  // Utility Helpers
  // =====================================

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hashPasswordResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
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

  // =====================================
  // Error Helpers
  // =====================================

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private getUniqueConstraintMessage(
    error: Prisma.PrismaClientKnownRequestError,
  ): string {
    const target = error.meta?.target;

    const fields = Array.isArray(target)
      ? target
      : typeof target === 'string'
        ? [target]
        : [];

    if (fields.includes('email')) {
      return 'Email is already registered.';
    }

    return 'Email or organization slug is already in use.';
  }
}
