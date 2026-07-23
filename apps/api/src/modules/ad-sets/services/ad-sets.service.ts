import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import {
  AdSet,
  AdSetStatus,
  AuditAction,
  AuditEntity,
  BillingEvent,
  Prisma,
} from '@prisma/client';
import {
  AD_SET_ALLOWED_SORT_FIELDS,
  AD_SET_DEFAULT_PAGE_SIZE,
  AD_SET_INCLUDE,
  AdSetSortField,
} from '../constants/ad-set.constants';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';

import { CreateAdSetDto } from '../dto/create-ad-set.dto';
import { UpdateAdSetDto } from '../dto/update-ad-set.dto';
import { FindAllAdSetsDto } from '../dto/find-all-ad-sets.dto';
import { AdSetResponseDto } from '../dto/ad-set-response.dto';

import { AdSetMapper } from '../mappers/ad-set.mapper';


const ALLOWED_SORT_FIELDS = [
  'name',
  'status',
  'createdAt',
  'updatedAt',
  'startDate',
  'endDate',
  'dailyBudget',
  'lifetimeBudget',
  'bidAmount',
] as const;

type SortField = (typeof ALLOWED_SORT_FIELDS)[number];

@Injectable()
export class AdSetsService {
  private readonly logger = new Logger(AdSetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly adSetMapper: AdSetMapper,
  ) {}

  async create(
    createAdSetDto: CreateAdSetDto,
    currentUser: JwtPayload,
  ): Promise<AdSetResponseDto> {
    const {
      campaignId,
      startDate,
      endDate,
    } = createAdSetDto;

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.verifyCampaignOwnership(
          campaignId,
          currentUser.organizationId,
          tx,
        );

        const adSet = await tx.adSet.create({
          data: {
            organizationId: currentUser.organizationId,

            campaignId,

            externalId: crypto.randomUUID(),

            name: createAdSetDto.name,

            status: AdSetStatus.DRAFT,

            dailyBudget: createAdSetDto.dailyBudget,

            lifetimeBudget: createAdSetDto.lifetimeBudget,

            bidAmount: createAdSetDto.bidAmount,

            billingEvent: createAdSetDto.billingEvent,

            targeting: createAdSetDto.targeting,

            startDate: startDate
              ? new Date(startDate)
              : undefined,

            endDate: endDate
              ? new Date(endDate)
              : undefined,

            metadata: createAdSetDto.metadata,

            tags: createAdSetDto.tags,

            isActive: createAdSetDto.isActive ?? true,

            version: 1,
          },

          include: AD_SET_INCLUDE,
        });

        await this.auditLogsService.log(
          {
            organizationId: currentUser.organizationId,
            actorId: currentUser.sub,
            action: AuditAction.AD_SET_CREATED,
            entity: AuditEntity.AD_SET,
            entityId: adSet.id,
            metadata: {
              name: adSet.name,
              campaignId: adSet.campaignId,
            },
          },
          tx,
        );

        this.logger.log(
          {
            msg: 'Ad Set created',
            adSetId: adSet.id,
            organizationId: currentUser.organizationId,
            userId: currentUser.sub,
          },
          'AdSetsService.create',
        );

        return this.adSetMapper.toResponse(adSet);
      });
    } catch (error) {
      this.handlePrismaError(error, {
        campaignId,
        name: createAdSetDto.name,
      });

      throw error;
    }
  }
  async findAll(
  query: FindAllAdSetsDto,
  currentUser: JwtPayload,
): Promise<PaginatedResponseDto<AdSetResponseDto>> {
const {
  page = 1,
  limit = AD_SET_DEFAULT_PAGE_SIZE,
  search,
  status,
  campaignId,
  billingEvent,
  isActive,
  sortBy,
  sortOrder = 'desc',
} = query;

  const safeSortBy = this.ensureValidSortField(sortBy);

  const where = this.buildWhereClause({
    organizationId: currentUser.organizationId,
    search,
    status,
    campaignId,
    billingEvent,
    isActive,
  });

  const skip = (page - 1) * limit;

  const [adSets, total] = await this.prisma.$transaction([
    this.prisma.adSet.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [safeSortBy]: sortOrder,
      },
      include: AD_SET_INCLUDE,
    }),
    this.prisma.adSet.count({
      where,
    }),
  ]);

  const data = adSets.map((adSet) =>
    this.adSetMapper.toResponse(adSet),
  );

  this.logger.debug(
    {
      msg: 'Fetched ad sets',
      page,
      limit,
      total,
      organizationId: currentUser.organizationId,
    },
    'AdSetsService.findAll',
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
): Promise<AdSetResponseDto> {
  return this.getAdSetOrThrow(
    id,
    currentUser.organizationId,
  );
}
async update(
  id: string,
  updateAdSetDto: UpdateAdSetDto,
  currentUser: JwtPayload,
): Promise<AdSetResponseDto> {
  const {
    version,
    startDate,
    endDate,
  } = updateAdSetDto;

  if (version === undefined) {
    throw new BadRequestException(
      'Version is required for optimistic locking.',
    );
  }

  try {
    return await this.prisma.$transaction(async (tx) => {
    
      const result = await tx.adSet.updateMany({
        where: {
          id,
          organizationId: currentUser.organizationId,
          deletedAt: null,
          version,
        },
        data: {
          ...updateAdSetDto,

          startDate: startDate
            ? new Date(startDate)
            : undefined,

          endDate: endDate
            ? new Date(endDate)
            : undefined,

          version: {
            increment: 1,
          },
        },
      });

      if (result.count === 0) {
        const exists = await tx.adSet.findFirst({
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
            'Ad Set not found.',
          );
        }

        throw new ConflictException(
          'Ad Set was modified by another user. Please refresh and try again.',
        );
      }

      const updatedAdSet = await tx.adSet.findFirst({
        where: {
          id,
          organizationId: currentUser.organizationId,
          deletedAt: null,
        },
        include: AD_SET_INCLUDE,
      });

      if (!updatedAdSet) {
        throw new NotFoundException(
          'Ad Set not found after update.',
        );
      }

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.AD_SET_UPDATED,
          entity: AuditEntity.AD_SET,
          entityId: updatedAdSet.id,
          metadata: {
            changes: JSON.parse(
              JSON.stringify(updateAdSetDto),
            ),
          },
        },
        tx,
      );

      this.logger.log(
        {
          msg: 'Ad Set updated',
          adSetId: id,
          oldVersion: version,
          newVersion: updatedAdSet.version,
          organizationId: currentUser.organizationId,
          userId: currentUser.sub,
        },
        'AdSetsService.update',
      );

      return this.adSetMapper.toResponse(
        updatedAdSet,
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
    const adSet = await tx.adSet.findFirst({
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

    if (!adSet) {
      throw new NotFoundException('Ad Set not found.');
    }

    const activeAds = await tx.ad.count({
      where: {
        adSetId: adSet.id,
        deletedAt: null,
      },
    });

    if (activeAds > 0) {
      throw new BadRequestException(
        'Cannot delete an ad set that contains ads.',
      );
    }

    await tx.adSet.update({
      where: {
        id: adSet.id,
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
        action: AuditAction.AD_SET_DELETED,
        entity: AuditEntity.AD_SET,
        entityId: adSet.id,
        metadata: {
          adSetName: adSet.name,
        },
      },
      tx,
    );

    this.logger.log(
      {
        msg: 'Ad Set deleted',
        adSetId: id,
        name: adSet.name,
        organizationId: currentUser.organizationId,
        userId: currentUser.sub,
      },
      'AdSetsService.remove',
    );
  });
}
private async verifyCampaignOwnership(
  campaignId: string,
  organizationId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const campaign = await tx.campaign.findFirst({
    where: {
      id: campaignId,
      organizationId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!campaign) {
    throw new NotFoundException('Campaign not found.');
  }
}
private async getAdSetOrThrow(
  id: string,
  organizationId: string,
): Promise<AdSetResponseDto> {
  const adSet = await this.prisma.adSet.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
    include: AD_SET_INCLUDE,
  });

  if (!adSet) {
    throw new NotFoundException('Ad Set not found.');
  }

  return this.adSetMapper.toResponse(adSet);
}
private buildWhereClause(params: {
  organizationId: string;
  search?: string;
  status?: AdSetStatus;
  campaignId?: string;
  billingEvent?: BillingEvent;
  isActive?: boolean;
}): Prisma.AdSetWhereInput {
  const {
    organizationId,
    search,
    status,
    campaignId,
    billingEvent,
    isActive,
  } = params;

  const where: Prisma.AdSetWhereInput = {
    organizationId,
    deletedAt: null,

    ...(status && {
      status,
    }),

    ...(campaignId && {
      campaignId,
    }),

    ...(billingEvent && {
      billingEvent,
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

      if (field.includes('campaignId')) {
        throw new NotFoundException(
          'Campaign not found.',
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
        'AdSetsService.handlePrismaError',
      );

      throw error;
    }
  }
}
private ensureValidSortField(sortBy?: string): AdSetSortField {
  if (!sortBy) {
    return 'createdAt';
  }

  if (AD_SET_ALLOWED_SORT_FIELDS.includes(sortBy as AdSetSortField)) {
    return sortBy as AdSetSortField;
  }

  return 'createdAt';
}
}