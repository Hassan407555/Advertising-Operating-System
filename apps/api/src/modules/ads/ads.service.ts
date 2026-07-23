import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import {
  Ad,
  AdStatus,
  AuditAction,
  AuditEntity,
  Prisma,
} from '@prisma/client';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { AuditLogsService } from '../audit-logs/services/audit-logs.service';

import {
  AD_ALLOWED_SORT_FIELDS,
  AD_DEFAULT_PAGE_SIZE,
  AD_INCLUDE,
  AdSortField,
} from './constants/ad.constants';

import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { AdQueryDto } from './dto/query-ads.dto';
import { AdResponseDto } from './dto/ad-response.dto';

import { AdMapper } from './mapper/ad.mapper';

const ALLOWED_SORT_FIELDS = [
  'name',
  'status',
  'createdAt',
  'updatedAt',
] as const;

type SortField = (typeof ALLOWED_SORT_FIELDS)[number];

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly adMapper: AdMapper,
  ) {}
  async create(
  createAdDto: CreateAdDto,
  currentUser: JwtPayload,
): Promise<AdResponseDto> {
  const {
    adSetId,
    creativeId,
  } = createAdDto;

  try {
    return await this.prisma.$transaction(async (tx) => {
      await this.verifyAdSetOwnership(
        adSetId,
        currentUser.organizationId,
        tx,
      );

      if (creativeId) {
        await this.verifyCreativeOwnership(
          creativeId,
          currentUser.organizationId,
          tx,
        );
      }

      const ad = await tx.ad.create({
        data: {
          organizationId: currentUser.organizationId,

          adSetId,

          creativeId,

          externalId: crypto.randomUUID(),

          name: createAdDto.name,

          status: AdStatus.DRAFT,

          metadata: createAdDto.metadata,

          tags: createAdDto.tags,

          isActive: createAdDto.isActive ?? true,

          version: 1,
        },

        include: AD_INCLUDE,
      });

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.AD_CREATED,
          entity: AuditEntity.AD,
          entityId: ad.id,
          metadata: {
            name: ad.name,
            adSetId: ad.adSetId,
            creativeId: ad.creativeId,
          },
        },
        tx,
      );

      this.logger.log(
        {
          msg: 'Ad created',
          adId: ad.id,
          organizationId: currentUser.organizationId,
          userId: currentUser.sub,
        },
        'AdsService.create',
      );

      return this.adMapper.toResponse(ad);
    });
  } catch (error) {
    this.handlePrismaError(error, {
      adSetId,
      creativeId,
      name: createAdDto.name,
    });

    throw error;
  }
}
async findAll(
  query: AdQueryDto,
  currentUser: JwtPayload,
): Promise<PaginatedResponseDto<AdResponseDto>> {
  const {
    page = 1,
    limit = AD_DEFAULT_PAGE_SIZE,
    search,
    status,
    adSetId,
    creativeId,
    isActive,
    sortBy,
    sortOrder = 'desc',
  } = query;

  const safeSortBy = this.ensureValidSortField(sortBy);

  const where = this.buildWhereClause({
    organizationId: currentUser.organizationId,
    search,
    status,
    adSetId,
    creativeId,
    isActive,
  });

  const skip = (page - 1) * limit;

  const [ads, total] = await this.prisma.$transaction([
    this.prisma.ad.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [safeSortBy]: sortOrder,
      },
      include: AD_INCLUDE,
    }),

    this.prisma.ad.count({
      where,
    }),
  ]);

  const data = ads.map((ad) =>
    this.adMapper.toResponse(ad),
  );

  this.logger.debug(
    {
      msg: 'Fetched ads',
      page,
      limit,
      total,
      organizationId: currentUser.organizationId,
    },
    'AdsService.findAll',
  );

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}
async findOne(
  id: string,
  currentUser: JwtPayload,
): Promise<AdResponseDto> {
  return this.getAdOrThrow(
    id,
    currentUser.organizationId,
  );
}
async update(
  id: string,
  updateAdDto: UpdateAdDto,
  currentUser: JwtPayload,
): Promise<AdResponseDto> {
  const {
    version,
    creativeId,
  } = updateAdDto;

  if (version === undefined) {
    throw new BadRequestException(
      'Version is required for optimistic locking.',
    );
  }

  try {
    return await this.prisma.$transaction(async (tx) => {
      if (creativeId) {
        await this.verifyCreativeOwnership(
          creativeId,
          currentUser.organizationId,
          tx,
        );
      }

      const result = await tx.ad.updateMany({
        where: {
          id,
          organizationId: currentUser.organizationId,
          deletedAt: null,
          version,
        },
        data: {
          ...updateAdDto,

          version: {
            increment: 1,
          },
        },
      });

      if (result.count === 0) {
        const exists = await tx.ad.findFirst({
          where: {
            id,
            organizationId: currentUser.organizationId,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

        if (!exists) {
          throw new NotFoundException(
            'Ad not found.',
          );
        }

        throw new ConflictException(
          'Ad was modified by another user. Please refresh and try again.',
        );
      }

      const updatedAd = await tx.ad.findFirst({
        where: {
          id,
          organizationId: currentUser.organizationId,
          deletedAt: null,
        },
        include: AD_INCLUDE,
      });

      if (!updatedAd) {
        throw new NotFoundException(
          'Ad not found after update.',
        );
      }

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.AD_UPDATED,
          entity: AuditEntity.AD,
          entityId: updatedAd.id,
          metadata: {
            changes: JSON.parse(
              JSON.stringify(updateAdDto),
            ),
          },
        },
        tx,
      );

      this.logger.log(
        {
          msg: 'Ad updated',
          adId: id,
          oldVersion: version,
          newVersion: updatedAd.version,
          organizationId: currentUser.organizationId,
          userId: currentUser.sub,
        },
        'AdsService.update',
      );

      return this.adMapper.toResponse(
        updatedAd,
      );
    });
  } catch (error) {
    this.handlePrismaError(error, {
      id,
    });

    throw error;
  }
}
async remove(
  id: string,
  currentUser: JwtPayload,
): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    const ad = await tx.ad.findFirst({
      where: {
        id,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!ad) {
      throw new NotFoundException('Ad not found.');
    }

    await tx.ad.update({
      where: {
        id: ad.id,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
        version: {
          increment: 1,
        },
      },
    });

    await this.auditLogsService.log(
      {
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        action: AuditAction.AD_DELETED,
        entity: AuditEntity.AD,
        entityId: ad.id,
        metadata: {
          adName: ad.name,
        },
      },
      tx,
    );

    this.logger.log(
      {
        msg: 'Ad deleted',
        adId: id,
        name: ad.name,
        organizationId: currentUser.organizationId,
        userId: currentUser.sub,
      },
      'AdsService.remove',
    );
  });
}
private async verifyAdSetOwnership(
  adSetId: string,
  organizationId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const adSet = await tx.adSet.findFirst({
    where: {
      id: adSetId,
      organizationId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!adSet) {
    throw new NotFoundException(
      'Ad Set not found.',
    );
  }
}
private async verifyCreativeOwnership(
  creativeId: string,
  organizationId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const creative = await tx.creative.findFirst({
    where: {
      id: creativeId,
      organizationId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!creative) {
    throw new NotFoundException(
      'Creative not found.',
    );
  }
}
private async getAdOrThrow(
  id: string,
  organizationId: string,
): Promise<AdResponseDto> {
  const ad = await this.prisma.ad.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
    include: AD_INCLUDE,
  });

  if (!ad) {
    throw new NotFoundException(
      'Ad not found.',
    );
  }

  return this.adMapper.toResponse(ad);
}
private buildWhereClause(params: {
  organizationId: string;
  search?: string;
  status?: AdStatus;
  adSetId?: string;
  creativeId?: string;
  isActive?: boolean;
}): Prisma.AdWhereInput {
  const {
    organizationId,
    search,
    status,
    adSetId,
    creativeId,
    isActive,
  } = params;

  const where: Prisma.AdWhereInput = {
    organizationId,
    deletedAt: null,

    ...(status && {
      status,
    }),

    ...(adSetId && {
      adSetId,
    }),

    ...(creativeId && {
      creativeId,
    }),

    ...(isActive !== undefined && {
      isActive,
    }),
  };

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
    ];
  }

  return where;
}
private handlePrismaError(
  error: unknown,
  context: Record<string, unknown>,
): void {
  if (!(error instanceof PrismaClientKnownRequestError)) {
    return;
  }

  switch (error.code) {
    case 'P2002': {
      throw new ConflictException(
        'A unique constraint was violated.',
      );
    }

    case 'P2003': {
      const field =
        (error.meta?.field_name as string) || '';

      if (field.includes('adSetId')) {
        throw new NotFoundException(
          'Ad Set not found.',
        );
      }

      if (field.includes('creativeId')) {
        throw new NotFoundException(
          'Creative not found.',
        );
      }

      throw new BadRequestException(
        'Invalid reference provided.',
      );
    }

    case 'P2025': {
      throw new NotFoundException(
        'Record not found.',
      );
    }

    default: {
      this.logger.error(
        {
          msg: 'Unhandled Prisma error',
          code: error.code,
          message: error.message,
          context,
        },
        error.stack,
        'AdsService.handlePrismaError',
      );

      throw error;
    }
  }
}
private ensureValidSortField(
  sortBy?: string,
): AdSortField {
  if (!sortBy) {
    return 'createdAt';
  }

  if (
    AD_ALLOWED_SORT_FIELDS.includes(
      sortBy as AdSortField,
    )
  ) {
    return sortBy as AdSortField;
  }

  return 'createdAt';
}
}