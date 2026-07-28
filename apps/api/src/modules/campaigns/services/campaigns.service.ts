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
  type CampaignWithRelations,
} from '../constants/campaign.constants';
import { CampaignQueryDto } from '../dto/campaign-query.dto';
import { CampaignResponseDto } from '../dto/campaign-response.dto';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import {
  CampaignMapper,
  type CampaignDraftEnrichment,
} from '../mappers/campaign.mapper';

interface CampaignProvenance {
  source: string | null;
  aiSessionId: string | null;
  shopifyStoreId: string | null;
  productId: string | null;
  campaignType: string | null;
}

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
      throw new BadRequestException('Start date must be before end date.');
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
            startDate: dto.startDate ? new Date(dto.startDate) : undefined,
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
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
      storeId,
      campaignType,
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
      storeId,
      campaignType,
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
      this.prisma.campaign.count({ where }),
    ]);

    const enrichments = await this.buildEnrichments(
      campaigns,
      currentUser.organizationId,
    );

    this.logger.debug({
      message: 'Campaigns retrieved.',
      organizationId: currentUser.organizationId,
      page,
      limit,
      total,
    });

    return {
      data: campaigns.map((campaign) =>
        this.campaignMapper.toResponse(campaign, enrichments.get(campaign.id)),
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

    const enrichments = await this.buildEnrichments(
      [campaign],
      currentUser.organizationId,
    );

    return this.campaignMapper.toResponse(
      campaign,
      enrichments.get(campaign.id),
    );
  }

  async update(
    id: string,
    dto: UpdateCampaignDto,
    currentUser: JwtPayload,
  ): Promise<CampaignResponseDto> {
    const { version, adAccountId, startDate, endDate } = dto;

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
      throw new BadRequestException('Start date must be before end date.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.getCampaignOrThrow(id, currentUser.organizationId, tx);

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
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.slug !== undefined && { slug: dto.slug }),
            ...(dto.objective !== undefined && { objective: dto.objective }),
            ...(dto.buyingType !== undefined && {
              buyingType: dto.buyingType,
            }),
            ...(dto.currency !== undefined && { currency: dto.currency }),
            ...(dto.dailyBudget !== undefined && {
              dailyBudget: dto.dailyBudget,
            }),
            ...(dto.lifetimeBudget !== undefined && {
              lifetimeBudget: dto.lifetimeBudget,
            }),
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            ...(startDate !== undefined && {
              startDate: startDate ? new Date(startDate) : null,
            }),
            ...(endDate !== undefined && {
              endDate: endDate ? new Date(endDate) : null,
            }),
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw new ConflictException(
            'Campaign has been modified by another user. Please refresh and try again.',
          );
        }

        const campaign = await tx.campaign.findUnique({
          where: { id },
          include: CAMPAIGN_INCLUDE,
        });

        if (!campaign) {
          throw new NotFoundException('Campaign not found.');
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

        return this.campaignMapper.toResponse(campaign);
      });
    } catch (error) {
      this.handlePrismaError(error);
      throw error;
    }
  }

  async remove(id: string, currentUser: JwtPayload): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const campaign = await this.getCampaignOrThrow(
          id,
          currentUser.organizationId,
          tx,
        );

        const now = new Date();
        const provenance = this.parseProvenance(campaign.metadata);

        await tx.campaign.update({
          where: { id: campaign.id },
          data: {
            deletedAt: now,
            isActive: false,
            version: { increment: 1 },
          },
        });

        const adSets = await tx.adSet.findMany({
          where: {
            campaignId: campaign.id,
            organizationId: currentUser.organizationId,
            deletedAt: null,
          },
          select: { id: true },
        });
        const adSetIds = adSets.map((row) => row.id);

        if (adSetIds.length > 0) {
          await tx.adSet.updateMany({
            where: {
              id: { in: adSetIds },
              organizationId: currentUser.organizationId,
              deletedAt: null,
            },
            data: {
              deletedAt: now,
              isActive: false,
              version: { increment: 1 },
            },
          });

          const ads = await tx.ad.findMany({
            where: {
              adSetId: { in: adSetIds },
              organizationId: currentUser.organizationId,
              deletedAt: null,
            },
            select: { id: true, creativeId: true },
          });
          const adIds = ads.map((row) => row.id);
          const creativeIds = [
            ...new Set(
              ads
                .map((row) => row.creativeId)
                .filter((value): value is string => Boolean(value)),
            ),
          ];

          if (adIds.length > 0) {
            await tx.ad.updateMany({
              where: {
                id: { in: adIds },
                organizationId: currentUser.organizationId,
                deletedAt: null,
              },
              data: {
                deletedAt: now,
                isActive: false,
                version: { increment: 1 },
              },
            });
          }

          if (creativeIds.length > 0) {
            await tx.creative.updateMany({
              where: {
                id: { in: creativeIds },
                organizationId: currentUser.organizationId,
                deletedAt: null,
              },
              data: {
                deletedAt: now,
                isActive: false,
                version: { increment: 1 },
              },
            });
          }
        }

        await this.clearDraftCampaignIdsFromSession(
          tx,
          currentUser.organizationId,
          campaign.id,
          provenance.aiSessionId,
        );

        await this.auditLogsService.log(
          {
            organizationId: currentUser.organizationId,
            actorId: currentUser.sub,
            action: AuditAction.CAMPAIGN_DELETED,
            entity: AuditEntity.CAMPAIGN,
            entityId: campaign.id,
            metadata: {
              campaignName: campaign.name,
              cascadedDraft: true,
              aiSessionId: provenance.aiSessionId,
            },
          },
          tx,
        );

        this.logger.log({
          message: 'Campaign draft deleted with cascade.',
          campaignId: campaign.id,
          organizationId: currentUser.organizationId,
          userId: currentUser.sub,
          aiSessionId: provenance.aiSessionId,
        });
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
    storeId?: string;
    campaignType?: string;
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

    // Lightweight metadata filters — only applied when explicitly requested.
    const metadataFilters: Prisma.CampaignWhereInput[] = [];
    if (filters.storeId) {
      // Prefer the FK column; also match legacy drafts that only stored store id in metadata.
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { shopifyStoreId: filters.storeId },
            {
              shopifyStoreId: null,
              metadata: {
                path: ['shopifyStoreId'],
                equals: filters.storeId,
              },
            },
          ],
        },
      ];
    }
    if (filters.campaignType) {
      metadataFilters.push({
        metadata: {
          path: ['campaignType'],
          equals: filters.campaignType,
        },
      });
    }
    if (metadataFilters.length > 0) {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...metadataFilters];
    }

    return where;
  }

  private ensureValidSortField(sortBy?: string): CampaignSortField {
    if (
      sortBy &&
      CAMPAIGN_SORT_FIELDS.includes(sortBy as CampaignSortField)
    ) {
      return sortBy as CampaignSortField;
    }
    return DEFAULT_SORT_BY;
  }

  private async buildEnrichments(
    campaigns: CampaignWithRelations[],
    organizationId: string,
  ): Promise<Map<string, CampaignDraftEnrichment>> {
    const result = new Map<string, CampaignDraftEnrichment>();
    if (campaigns.length === 0) {
      return result;
    }

    const provenances = campaigns.map((campaign) => ({
      campaignId: campaign.id,
      shopifyStoreId: campaign.shopifyStoreId,
      provenance: this.parseProvenance(campaign.metadata),
    }));

    const storeIds = [
      ...new Set(
        provenances
          .map((row) => row.shopifyStoreId ?? row.provenance.shopifyStoreId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const productIds = [
      ...new Set(
        provenances
          .map((row) => row.provenance.productId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const [stores, products] = await Promise.all([
      storeIds.length > 0
        ? this.prisma.platformConnection.findMany({
            where: {
              id: { in: storeIds },
              organizationId,
              deletedAt: null,
            },
            select: { id: true, accountName: true, accountId: true },
          })
        : Promise.resolve([]),
      productIds.length > 0
        ? this.prisma.shopifyProduct.findMany({
            where: {
              id: { in: productIds },
              organizationId,
              deletedAt: null,
            },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
    ]);

    const storeById = new Map<string, { id: string; name: string }>();
    for (const store of stores) {
      storeById.set(store.id, {
        id: store.id,
        name: store.accountName || store.accountId,
      });
    }

    const productById = new Map<string, { id: string; title: string }>();
    for (const product of products) {
      productById.set(product.id, {
        id: product.id,
        title: product.title,
      });
    }

    for (const { campaignId, shopifyStoreId, provenance } of provenances) {
      const resolvedStoreId = shopifyStoreId ?? provenance.shopifyStoreId;
      result.set(campaignId, {
        source: provenance.source,
        campaignType: provenance.campaignType,
        aiSessionId: provenance.aiSessionId,
        store: resolvedStoreId
          ? (storeById.get(resolvedStoreId) ?? null)
          : null,
        product: provenance.productId
          ? (productById.get(provenance.productId) ?? null)
          : null,
      });
    }

    return result;
  }

  private parseProvenance(metadata: unknown): CampaignProvenance {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {
        source: null,
        aiSessionId: null,
        shopifyStoreId: null,
        productId: null,
        campaignType: null,
      };
    }

    const record = metadata as Record<string, unknown>;
    return {
      source: typeof record.source === 'string' ? record.source : null,
      aiSessionId:
        typeof record.aiSessionId === 'string' ? record.aiSessionId : null,
      shopifyStoreId:
        typeof record.shopifyStoreId === 'string'
          ? record.shopifyStoreId
          : null,
      productId:
        typeof record.productId === 'string' ? record.productId : null,
      campaignType:
        typeof record.campaignType === 'string' ? record.campaignType : null,
    };
  }

  private async clearDraftCampaignIdsFromSession(
    tx: Prisma.TransactionClient,
    organizationId: string,
    campaignId: string,
    aiSessionId: string | null,
  ): Promise<void> {
    if (!aiSessionId) {
      return;
    }

    const session = await tx.aiSession.findFirst({
      where: {
        id: aiSessionId,
        organizationId,
      },
      select: {
        id: true,
        workflowContext: true,
      },
    });

    if (!session) {
      return;
    }

    const context =
      session.workflowContext &&
      typeof session.workflowContext === 'object' &&
      !Array.isArray(session.workflowContext)
        ? { ...(session.workflowContext as Record<string, unknown>) }
        : {};

    const draftIds = context.draftCampaignIds;
    if (
      draftIds &&
      typeof draftIds === 'object' &&
      !Array.isArray(draftIds) &&
      (draftIds as Record<string, unknown>).campaignId !== campaignId
    ) {
      return;
    }

    delete context.draftCampaignIds;

    await tx.aiSession.update({
      where: { id: session.id },
      data: {
        workflowContext: context as Prisma.InputJsonValue,
      },
    });
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
      select: { id: true },
    });

    if (!adAccount) {
      throw new BadRequestException('Ad account not found or inactive.');
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
          throw new NotFoundException('Campaign not found.');
      }
    }
    throw error;
  }
}
