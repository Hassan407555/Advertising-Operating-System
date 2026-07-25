import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  CampaignObjective,
  CampaignStatus,
  PlatformType,
  Prisma,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';
import {
  CAMPAIGN_INCLUDE,
  CAMPAIGN_SORT_FIELDS,
  DEFAULT_SORT_BY,
  type CampaignSortField,
} from '../constants/campaign.constants';
import { CampaignQueryDto } from '../dto/campaign-query.dto';
import { CampaignResponseDto } from '../dto/campaign-response.dto';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { CampaignMapper } from '../mappers/campaign.mapper';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly campaignMapper: CampaignMapper,
  ) {}
  async create(
  dto: CreateCampaignDto,
  currentUser: JwtPayload,
): Promise<CampaignResponseDto> {
  if (
    dto.startDate &&
    dto.endDate &&
    new Date(dto.startDate) > new Date(dto.endDate)
  ) {
    throw new BadRequestException(
      'Start date must be before end date.',
    );
  }

  try {
    return await this.prisma.$transaction(async (tx) => {
      await this.verifyAdAccountOwnership(
        dto.adAccountId,
        currentUser.organizationId,
        tx,
      );

      const campaign = await tx.campaign.create({
        data: {
          organizationId: currentUser.organizationId,
          adAccountId: dto.adAccountId,

          externalId: `local_${crypto.randomUUID()}`,

          name: dto.name,
          slug: dto.slug,
          objective: dto.objective,
          buyingType: dto.buyingType,
          currency: dto.currency,

          dailyBudget: dto.dailyBudget,
          lifetimeBudget: dto.lifetimeBudget,

          startDate: dto.startDate
            ? new Date(dto.startDate)
            : undefined,

          endDate: dto.endDate
            ? new Date(dto.endDate)
            : undefined,

          status: CampaignStatus.DRAFT,
          isActive: dto.isActive ?? true,
          version: 1,
        },
        include: CAMPAIGN_INCLUDE,
      });

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.CAMPAIGN_CREATED,
          entity: AuditEntity.CAMPAIGN,
          entityId: campaign.id,
          metadata: {
            campaignName: campaign.name,
          },
        },
        tx,
      );

      return this.campaignMapper.toResponse(campaign);
    });
  } catch (error) {
    this.handlePrismaError(error);
  }
}
    async findAll(
    query: CampaignQueryDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<CampaignResponseDto>> {
    const {
      page,
      limit,
      search,
      status,
      objective,
      adAccountId,
      platform,
      isActive,
      sortBy,
      sortOrder,
    } = query;

    const where = this.buildWhereClause({
      organizationId: currentUser.organizationId,
      search,
      status,
      objective,
      adAccountId,
      platform,
      isActive,
    });

    const safeSortBy = this.ensureValidSortField(sortBy);

    const skip = (page - 1) * limit;

    const [campaigns, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [safeSortBy]: sortOrder,
        },
        include: CAMPAIGN_INCLUDE,
      }),

      this.prisma.campaign.count({
        where,
      }),
    ]);

    this.logger.debug({
      message: 'Campaigns retrieved.',
      organizationId: currentUser.organizationId,
      page,
      limit,
      total,
    });

    return {
      data: campaigns.map((campaign) =>
        this.campaignMapper.toResponse(campaign),
      ),

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
  ): Promise<CampaignResponseDto> {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
      include: CAMPAIGN_INCLUDE,
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found.');
    }

    return this.campaignMapper.toResponse(campaign);
  }
    async update(
    id: string,
    dto: UpdateCampaignDto,
    currentUser: JwtPayload,
  ): Promise<CampaignResponseDto> {
    const {
      version,
      adAccountId,
      startDate,
      endDate,
    } = dto;

    if (version === undefined) {
      throw new BadRequestException(
        'Version is required for optimistic locking.',
      );
    }

    if (
      startDate &&
      endDate &&
      new Date(startDate) > new Date(endDate)
    ) {
      throw new BadRequestException(
        'Start date must be before end date.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.getCampaignOrThrow(
          id,
          currentUser.organizationId,
          tx,
        );

        if (adAccountId) {
          await this.verifyAdAccountOwnership(
            adAccountId,
            currentUser.organizationId,
            tx,
          );
        }

        const result = await tx.campaign.updateMany({
          where: {
            id,
            organizationId: currentUser.organizationId,
            deletedAt: null,
            version,
          },
          data: {
            ...(adAccountId && { adAccountId }),

            ...(dto.name !== undefined && {
              name: dto.name,
            }),

            ...(dto.slug !== undefined && {
              slug: dto.slug,
            }),

            ...(dto.objective !== undefined && {
              objective: dto.objective,
            }),

            ...(dto.buyingType !== undefined && {
              buyingType: dto.buyingType,
            }),

            ...(dto.currency !== undefined && {
              currency: dto.currency,
            }),

            ...(dto.dailyBudget !== undefined && {
              dailyBudget: dto.dailyBudget,
            }),

            ...(dto.lifetimeBudget !== undefined && {
              lifetimeBudget: dto.lifetimeBudget,
            }),

            ...(dto.isActive !== undefined && {
              isActive: dto.isActive,
            }),

            ...(startDate !== undefined && {
              startDate: startDate
                ? new Date(startDate)
                : null,
            }),

            ...(endDate !== undefined && {
              endDate: endDate
                ? new Date(endDate)
                : null,
            }),

            version: {
              increment: 1,
            },
          },
        });

        if (result.count === 0) {
          throw new ConflictException(
            'Campaign has been modified by another user. Please refresh and try again.',
          );
        }

        const campaign = await tx.campaign.findUnique({
          where: {
            id,
          },
          include: CAMPAIGN_INCLUDE,
        });

        if (!campaign) {
          throw new NotFoundException(
            'Campaign not found.',
          );
        }

        await this.auditLogsService.log(
          {
            organizationId: currentUser.organizationId,
            actorId: currentUser.sub,
            action: AuditAction.CAMPAIGN_UPDATED,
            entity: AuditEntity.CAMPAIGN,
            entityId: campaign.id,
            metadata: {
              campaignName: campaign.name,
              version: campaign.version,
            },
          },
          tx,
        );

        this.logger.log({
          message: 'Campaign updated.',
          campaignId: campaign.id,
          organizationId: currentUser.organizationId,
          userId: currentUser.sub,
          version: campaign.version,
        });

        return this.campaignMapper.toResponse(
          campaign,
        );
      });
    } catch (error) {
      this.handlePrismaError(error);

      throw error;
    }
  }
  private buildWhereClause(filters: {
  organizationId: string;
  search?: string;
  status?: CampaignStatus;
  objective?: CampaignObjective;
  adAccountId?: string;
  platform?: PlatformType;
  isActive?: boolean;
}): Prisma.CampaignWhereInput {
  const where: Prisma.CampaignWhereInput = {
    organizationId: filters.organizationId,
    deletedAt: null,
  };

  if (filters.search) {
    where.OR = [
      {
        name: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        slug: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        externalId: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.objective) {
    where.objective = filters.objective;
  }

  if (filters.adAccountId) {
    where.adAccountId = filters.adAccountId;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.platform) {
    where.adAccount = {
      platform: filters.platform,
    };
  }

  return where;
}
private ensureValidSortField(
  sortBy?: string,
): CampaignSortField {
  if (
    sortBy &&
    CAMPAIGN_SORT_FIELDS.includes(
      sortBy as CampaignSortField,
    )
  ) {
    return sortBy as CampaignSortField;
  }

  return DEFAULT_SORT_BY;
}
    async remove(
    id: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const campaign = await this.getCampaignOrThrow(
          id,
          currentUser.organizationId,
          tx,
        );

        if (campaign.deletedAt) {
          throw new NotFoundException(
            'Campaign not found.',
          );
        }

        await tx.campaign.update({
          where: {
            id: campaign.id,
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
            action: AuditAction.CAMPAIGN_DELETED,
            entity: AuditEntity.CAMPAIGN,
            entityId: campaign.id,
            metadata: {
              campaignName: campaign.name,
            },
          },
          tx,
        );

        this.logger.log({
          message: 'Campaign deleted.',
          campaignId: campaign.id,
          organizationId: currentUser.organizationId,
          userId: currentUser.sub,
        });
      });
    } catch (error) {
      this.handlePrismaError(error);

      throw error;
    }
  }
  private async getCampaignOrThrow(
  campaignId: string,
  organizationId: string,
  tx: Prisma.TransactionClient,
) {
  const campaign = await tx.campaign.findFirst({
    where: {
      id: campaignId,
      organizationId,
      deletedAt: null,
    },
    include: CAMPAIGN_INCLUDE,
  });

  if (!campaign) {
    throw new NotFoundException('Campaign not found.');
  }

  return campaign;
}
private async verifyAdAccountOwnership(
  adAccountId: string,
  organizationId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const adAccount = await tx.adAccount.findFirst({
    where: {
      id: adAccountId,
      organizationId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!adAccount) {
    throw new BadRequestException(
      'Ad account not found or inactive.',
    );
  }
}
private handlePrismaError(error: unknown): never {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new ConflictException(
          'A campaign with the same unique value already exists.',
        );

      case 'P2025':
        throw new NotFoundException(
          'Campaign not found.',
        );
    }
  }

  throw error;
}
}