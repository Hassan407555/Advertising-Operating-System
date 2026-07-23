import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, AuditAction, AuditEntity } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

import { AuditLogsService } from '../audit-logs/services/audit-logs.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import { CreateCreativeDto } from './dto/create-creative.dto';
import { UpdateCreativeDto } from './dto/update-creative.dto';
import { CreativeQueryDto } from './dto/creative-query.dto';
import { CreativeResponseDto } from './dto/creative-response.dto';

import {
  CREATIVE_DEFAULT_LIMIT,
  CREATIVE_DEFAULT_PAGE,
  CREATIVE_DEFAULT_SORT_ORDER,
  CREATIVE_DEFAULT_SORT_BY,
  CREATIVE_INCLUDE,
  CREATIVE_SORT_FIELDS,
  CreativeSortField,
} from './constants/creative.constants';

import { CreativeMapper } from './mappers/creative.mapper';

@Injectable()
export class CreativesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: CreativeMapper,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    dto: CreateCreativeDto,
    currentUser: JwtPayload,
  ): Promise<CreativeResponseDto> {
    try {
      const creative = await this.prisma.creative.create({
        data: {
          organizationId: currentUser.organizationId,

          externalId: dto.externalId,
          externalName: dto.externalName,

          name: dto.name,
          type: dto.type,

          headline: dto.headline,
          primaryText: dto.primaryText,
          description: dto.description,

          callToAction: dto.callToAction,

          landingPageUrl: dto.landingPageUrl,
          deepLinkUrl: dto.deepLinkUrl,

          isActive: dto.isActive ?? true,

          metadata: dto.metadata,
          tags: dto.tags,
        },
        include: CREATIVE_INCLUDE,
      });

      await this.auditLogsService.log({
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        action: AuditAction.CREATIVE_CREATED,
        entity: AuditEntity.CREATIVE,
        entityId: creative.id,
        metadata: {
          name: creative.name,
          type: creative.type,
        },
      });

      return this.mapper.toResponse(creative);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(
    query: CreativeQueryDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<CreativeResponseDto>> {
    const page = query.page ?? CREATIVE_DEFAULT_PAGE;

    const limit = query.limit ?? CREATIVE_DEFAULT_LIMIT;

    const skip = (page - 1) * limit;

    const where: Prisma.CreativeWhereInput = {
      organizationId: currentUser.organizationId,
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          externalName: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          headline: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.callToAction) {
      where.callToAction = query.callToAction;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.archived !== undefined) {
      where.archivedAt = query.archived
        ? {
            not: null,
          }
        : null;
    }

    if (query.externalId) {
      where.externalId = query.externalId;
    }

    const sortBy = (
      CREATIVE_SORT_FIELDS.includes(query.sortBy as CreativeSortField)
        ? query.sortBy
        : CREATIVE_DEFAULT_SORT_BY
    ) as CreativeSortField;

    const sortOrder = query.sortOrder ?? CREATIVE_DEFAULT_SORT_ORDER;

    const [creatives, total] = await this.prisma.$transaction([
      this.prisma.creative.findMany({
        where,
        include: CREATIVE_INCLUDE,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.creative.count({
        where,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: this.mapper.toResponseList(creatives),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(
    id: string,
    currentUser: JwtPayload,
  ): Promise<CreativeResponseDto> {
    const creative = await this.prisma.creative.findFirst({
      where: {
        id,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
      include: CREATIVE_INCLUDE,
    });

    if (!creative) {
      throw new NotFoundException('Creative not found.');
    }

    return this.mapper.toResponse(creative);
  }

  async update(
    id: string,
    dto: UpdateCreativeDto,
    currentUser: JwtPayload,
  ): Promise<CreativeResponseDto> {
    const existing = await this.prisma.creative.findFirst({
      where: {
        id,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Creative not found.');
    }

    if (dto.version !== existing.version) {
      throw new ConflictException('Creative has been modified by another user.');
    }

    const { version, ...updateData } = dto;

    try {
      const result = await this.prisma.creative.updateMany({
        where: {
          id,
          organizationId: currentUser.organizationId,
          deletedAt: null,
          version: dto.version,
        },
        data: {
          ...updateData,
          version: {
            increment: 1,
          },
        },
      });

      if (result.count === 0) {
        throw new ConflictException('Creative has been modified by another user.');
      }

      const creative = await this.prisma.creative.findUniqueOrThrow({
        where: {
          id,
        },
        include: CREATIVE_INCLUDE,
      });

      await this.auditLogsService.log({
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        action: AuditAction.CREATIVE_UPDATED,
        entity: AuditEntity.CREATIVE,
        entityId: creative.id,
        metadata: {
          name: creative.name,
          type: creative.type,
        },
      });

      return this.mapper.toResponse(creative);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(
    id: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    const creative = await this.prisma.creative.findFirst({
      where: {
        id,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
    });

    if (!creative) {
      throw new NotFoundException('Creative not found.');
    }

    try {
      await this.prisma.creative.update({
        where: {
          id,
        },
        data: {
          deletedAt: new Date(),
          isActive: false,
          version: {
            increment: 1,
          },
        },
      });

      await this.auditLogsService.log({
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        action: AuditAction.CREATIVE_DELETED,
        entity: AuditEntity.CREATIVE,
        entityId: id,
        metadata: {
          name: creative.name,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async archive(
    id: string,
    currentUser: JwtPayload,
  ): Promise<CreativeResponseDto> {
    const creative = await this.prisma.creative.findFirst({
      where: {
        id,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
    });

    if (!creative) {
      throw new NotFoundException('Creative not found.');
    }

    if (creative.archivedAt) {
      throw new BadRequestException('Creative is already archived.');
    }

    const updated = await this.prisma.creative.update({
      where: {
        id,
      },
      data: {
        archivedAt: new Date(),
        version: {
          increment: 1,
        },
      },
      include: CREATIVE_INCLUDE,
    });

    return this.mapper.toResponse(updated);
  }

  async restore(
    id: string,
    currentUser: JwtPayload,
  ): Promise<CreativeResponseDto> {
    const creative = await this.prisma.creative.findFirst({
      where: {
        id,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
    });

    if (!creative) {
      throw new NotFoundException('Creative not found.');
    }

    if (!creative.archivedAt) {
      throw new BadRequestException('Creative is not archived.');
    }

    const updated = await this.prisma.creative.update({
      where: {
        id,
      },
      data: {
        archivedAt: null,
        version: {
          increment: 1,
        },
      },
      include: CREATIVE_INCLUDE,
    });

    return this.mapper.toResponse(updated);
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException(
            'A creative with the same unique values already exists.',
          );

        case 'P2025':
          throw new NotFoundException('Creative not found.');

        default:
          throw new BadRequestException('Database operation failed.');
      }
    }

    throw error;
  }
}