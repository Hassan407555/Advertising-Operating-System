import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getMe(
    user: JwtPayload,
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: {
        id: user.sub,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found.');
    }

    return currentUser;
  }

  async updateMe(
    user: JwtPayload,
    dto: UpdateUserDto,
  ) {
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

    return this.prisma.user.update({
      where: {
        id: user.sub,
      },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}