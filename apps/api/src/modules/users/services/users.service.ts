import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(user: JwtPayload): Promise<UserResponseDto> {
    const currentUser = await this.prisma.user.findUnique({
      where: {
        id: user.sub,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        jobTitle: true,
        bio: true,
        timezone: true,
        language: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found.');
    }

    return this.toUserResponse(currentUser);
  }

  async updateMe(
    user: JwtPayload,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        id: user.sub,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: user.sub,
      },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatarUrl: dto.avatarUrl,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        bio: dto.bio,
        timezone: dto.timezone,
        language: dto.language,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        jobTitle: true,
        bio: true,
        timezone: true,
        language: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.toUserResponse(updatedUser);
  }

  private toUserResponse(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    phone: string | null;
    jobTitle: string | null;
    bio: string | null;
    timezone: string | null;
    language: string | null;
    status: string;
    emailVerifiedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserResponseDto {
    return {
      ...user,
    };
  }
}
