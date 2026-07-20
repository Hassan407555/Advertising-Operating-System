import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { MembershipRole, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import { generateUniqueOrganizationSlug } from '../../../common/utils/slug.util';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const slug = await generateUniqueOrganizationSlug(
          tx,
          registerDto.organizationName,
        );
        const organization = await tx.organization.create({
          data: { name: registerDto.organizationName, slug },
        });
        const userId = randomUUID();
        const tokens = await this.createTokens(userId, organization.id);
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

        return { user, organization, membership, tokens };
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
      where: { email },
      include: {
        memberships: {
          where: { role: MembershipRole.OWNER },
          orderBy: { createdAt: 'asc' },
          include: { organization: true },
        },
      },
    });

    if (
      !user ||
      !(await bcrypt.compare(loginDto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const membership = user.memberships[0];

    if (!membership) {
      throw new UnauthorizedException(
        'No owner organization is available for this user.',
      );
    }

    const tokens = await this.createTokens(user.id, membership.organizationId);
    await this.saveRefreshTokenHash(user.id, tokens.refreshToken);

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
      where: { id: payload.sub },
      select: { id: true, refreshTokenHash: true },
    });

    if (
      !user?.refreshTokenHash ||
      !(await bcrypt.compare(refreshToken, user.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const tokens = await this.createTokens(payload.sub, payload.organizationId);
    await this.saveRefreshTokenHash(payload.sub, tokens.refreshToken);

    return { success: true, data: { tokens } };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return { success: true };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

  private async createTokens(userId: string, organizationId: string) {
    const payload: JwtPayload = { sub: userId, organizationId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.getOrThrow<JwtSignOptions['expiresIn']>(
          'REFRESH_TOKEN_EXPIRES_IN',
        ),
      }),
    ]);

    return { accessToken, refreshToken };
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

  private async saveRefreshTokenHash(userId: string, refreshToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: await this.hashRefreshToken(refreshToken),
      },
    });
  }

  private hashRefreshToken(refreshToken: string): Promise<string> {
    return bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private buildAuthData({
    user,
    organization,
    membership,
    tokens,
  }: {
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
    membership: { id: string; role: MembershipRole };
    tokens: { accessToken: string; refreshToken: string };
  }) {
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        createdAt: user.createdAt,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
      },
      membership: {
        id: membership.id,
        role: membership.role,
      },
      tokens,
    };
  }

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
