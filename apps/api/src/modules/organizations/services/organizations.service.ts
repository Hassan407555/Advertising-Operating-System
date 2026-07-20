import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { UpdateOrganizationDto } from '../dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getCurrent(user: JwtPayload) {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id: user.organizationId,
      },
      include: {
        memberships: {
          where: {
            userId: user.sub,
          },
          select: {
            role: true,
          },
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

  async updateCurrent(
    user: JwtPayload,
    dto: UpdateOrganizationDto,
  ) {
    try {
      return await this.prisma.organization.update({
        where: {
          id: user.organizationId,
        },
        data: dto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Organization slug already exists.',
        );
      }

      throw error;
    }
  }
}