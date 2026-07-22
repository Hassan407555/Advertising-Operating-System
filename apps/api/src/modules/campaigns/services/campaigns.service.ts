import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Campaign,
  CampaignStatus,
  CampaignObjective,
  PlatformType,
  Prisma,
  AuditAction,
  AuditEntity,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { CampaignQueryDto } from '../dto/campaign-query.dto';
import { CampaignResponseDto } from '../dto/campaign-response.dto';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { CampaignMapper } from '../mappers/campaign.mapper';
import { CAMPAIGN_INCLUDE } from '../constants/campaign.constants';

// Whitelist of allowed sort fields – prevents injection and ensures index usage
const ALLOWED_SORT_FIELDS = [
  'name',
  'createdAt',
  'updatedAt',
  'startDate',
  'endDate',
  'status',
] as const;
type SortField = typeof ALLOWED_SORT_FIELDS[number];

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly campaignMapper: CampaignMapper,
  ) {}

  async create(
    createCampaignDto: CreateCampaignDto,
    currentUser: JwtPayload,
  ): Promise<CampaignResponseDto> {
    const { adAccountId, startDate, endDate } = createCampaignDto;

    // DTO validation already covers date/budget rules; we trust it.

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verify ad account belongs to the organization
        await this.verifyAdAccountOwnership(adAccountId, currentUser.organizationId, tx);

        const campaign = await tx.campaign.create({
          data: {
  organizationId: currentUser.organizationId,
  adAccountId,

  externalId: createCampaignDto.slug ?? crypto.randomUUID(),

  name: createCampaignDto.name,
            slug: createCampaignDto.slug,
            objective: createCampaignDto.objective,
            buyingType: createCampaignDto.buyingType,
            currency: createCampaignDto.currency,
            dailyBudget: createCampaignDto.dailyBudget,
            lifetimeBudget: createCampaignDto.lifetimeBudget,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            isActive: createCampaignDto.isActive ?? true,
            status: CampaignStatus.DRAFT,
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
              name: campaign.name,
              objective: campaign.objective,
              adAccountId: campaign.adAccountId,
            },
          },
          tx,
        );

        this.logger.log(
          {
            msg: 'Campaign created',
            campaignId: campaign.id,
            name: campaign.name,
            organizationId: currentUser.organizationId,
            userId: currentUser.sub,
          },
          'CampaignsService.create',
        );

        return this.campaignMapper.toResponse(campaign);
      });
    } catch (error) {
      this.handlePrismaError(error, {
        slug: createCampaignDto.slug,
        adAccountId,
      });
      throw error;
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

    const safeSortBy = this.ensureValidSortField(sortBy);

    const where = this.buildWhereClause({
      organizationId: currentUser.organizationId,
      search,
      status,
      objective,
      adAccountId,
      platform,
      isActive,
    });

    const skip = (page - 1) * limit;

    // Use a single transaction to avoid race conditions between count and findMany
    const [campaigns, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [safeSortBy]: sortOrder },
        include: CAMPAIGN_INCLUDE,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    const data = campaigns.map((campaign) => this.campaignMapper.toResponse(campaign));

    this.logger.debug(
      {
        msg: 'Fetched campaigns',
        page,
        limit,
        total,
        organizationId: currentUser.organizationId,
      },
      'CampaignsService.findAll',
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

  async findOne(id: string, currentUser: JwtPayload): Promise<CampaignResponseDto> {
    return this.getCampaignOrThrow(id, currentUser.organizationId);
  }

  async update(
    id: string,
    updateCampaignDto: UpdateCampaignDto,
    currentUser: JwtPayload,
  ): Promise<CampaignResponseDto> {
    const { version, adAccountId, startDate, endDate, slug } = updateCampaignDto;

    if (version === undefined) {
      throw new BadRequestException('Version is required for optimistic locking.');
    }

    // DTO validation already covers date/budget rules; we trust it.

    try {
      return await this.prisma.$transaction(async (tx) => {
        // If adAccountId is being changed, verify new account belongs to org
        if (adAccountId) {
          await this.verifyAdAccountOwnership(adAccountId, currentUser.organizationId, tx);
        }

        // Attempt update with optimistic locking
        const result = await tx.campaign.updateMany({
          where: {
            id,
            organizationId: currentUser.organizationId,
            deletedAt: null,
            version,
          },
          data: {
            ...updateCampaignDto,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          // Determine if the campaign exists (with any version)
          const exists = await tx.campaign.findFirst({
            where: { id, organizationId: currentUser.organizationId, deletedAt: null },
            select: { id: true },
          });
          if (!exists) {
            throw new NotFoundException('Campaign not found.');
          }
          throw new ConflictException(
            'Campaign was modified by another user. Please refresh and try again.',
          );
        }

        // Fetch the updated campaign with relations
        const updatedCampaign = await tx.campaign.findFirst({
          where: { id, organizationId: currentUser.organizationId, deletedAt: null },
          include: CAMPAIGN_INCLUDE,
        });

        if (!updatedCampaign) {
          throw new NotFoundException('Campaign not found after update.');
        }

        await this.auditLogsService.log(
          {
            organizationId: currentUser.organizationId,
            actorId: currentUser.sub,
            action: AuditAction.CAMPAIGN_UPDATED,
            entity: AuditEntity.CAMPAIGN,
            entityId: updatedCampaign.id,
metadata: {
  changes: JSON.parse(JSON.stringify(updateCampaignDto)),
},
          },
          tx,
        );

        this.logger.log(
          {
            msg: 'Campaign updated',
            campaignId: id,
            oldVersion: version,
            newVersion: updatedCampaign.version,
            organizationId: currentUser.organizationId,
            userId: currentUser.sub,
          },
          'CampaignsService.update',
        );

        return this.campaignMapper.toResponse(updatedCampaign);
      });
    } catch (error) {
      this.handlePrismaError(error, { id, slug, adAccountId });
      throw error;
    }
  }

  async remove(id: string, currentUser: JwtPayload): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Fetch campaign to ensure it exists and get name for audit
      const campaign = await tx.campaign.findFirst({
        where: { id, organizationId: currentUser.organizationId, deletedAt: null },
        select: { id: true, name: true },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found.');
      }

      // Check for existing ad sets
      const activeAdSets = await tx.adSet.count({
        where: { campaignId: campaign.id, deletedAt: null },
      });

      if (activeAdSets > 0) {
        throw new BadRequestException('Cannot delete a campaign that contains ad sets.');
      }

      // Soft delete
      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          version: { increment: 1 },
        },
      });

      await this.auditLogsService.log(
        {
          organizationId: currentUser.organizationId,
          actorId: currentUser.sub,
          action: AuditAction.CAMPAIGN_DELETED,
          entity: AuditEntity.CAMPAIGN,
          entityId: campaign.id,
          metadata: { campaignName: campaign.name },
        },
        tx,
      );

      this.logger.log(
        {
          msg: 'Campaign deleted',
          campaignId: id,
          name: campaign.name,
          organizationId: currentUser.organizationId,
          userId: currentUser.sub,
        },
        'CampaignsService.remove',
      );
    });
  }

  // ---------- Private Helpers ----------

  private async verifyAdAccountOwnership(
    adAccountId: string,
    organizationId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const adAccount = await tx.adAccount.findFirst({
      where: { id: adAccountId, organizationId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!adAccount) {
      throw new NotFoundException('Ad account not found.');
    }
  }

  private async getCampaignOrThrow(
    id: string,
    organizationId: string,
  ): Promise<CampaignResponseDto> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: CAMPAIGN_INCLUDE,
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found.');
    }

    return this.campaignMapper.toResponse(campaign);
  }

  private ensureValidSortField(sortBy?: string): SortField {
    if (sortBy && ALLOWED_SORT_FIELDS.includes(sortBy as SortField)) {
      return sortBy as SortField;
    }
    return 'createdAt';
  }

  private buildWhereClause(params: {
    organizationId: string;
    search?: string;
    status?: CampaignStatus;
    objective?: CampaignObjective;
    adAccountId?: string;
platform?: PlatformType;
    isActive?: boolean;
  }): Prisma.CampaignWhereInput {
    const { organizationId, search, status, objective, adAccountId, platform, isActive } = params;

    const where: Prisma.CampaignWhereInput = {
      organizationId,
      deletedAt: null,
      ...(status && { status }),
      ...(objective && { objective }),
      ...(adAccountId && { adAccountId }),
      ...(isActive !== undefined && { isActive }),
      ...(platform && {
        adAccount: { platform },
      }),
    };

    // Enhanced search: search across name and slug.
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Maps Prisma known request errors to appropriate NestJS HTTP exceptions.
   * Rethrows if the error is not recognized.
   */
  private handlePrismaError(error: unknown, context: Record<string, unknown>): void {
    if (!(error instanceof PrismaClientKnownRequestError)) {
      return;
    }

    switch (error.code) {
      case 'P2002': {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('slug')) {
          throw new ConflictException('Campaign slug already exists.');
        }
        throw new ConflictException('A unique constraint was violated.');
      }
      case 'P2003': {
        const field = (error.meta?.field_name as string) || '';
        if (field.includes('adAccountId')) {
          throw new NotFoundException('Ad account not found.');
        }
        throw new BadRequestException('Invalid reference provided.');
      }
      case 'P2025': {
        throw new NotFoundException('Record not found.');
      }
      default: {
        // Log unexpected Prisma errors and rethrow
        this.logger.error(
          {
            msg: 'Unhandled Prisma error',
            code: error.code,
            message: error.message,
            context,
          },
          error.stack,
          'CampaignsService.handlePrismaError',
        );
        // Rethrow the original error to preserve the stack and type
        throw error;
      }
    }
  }
}