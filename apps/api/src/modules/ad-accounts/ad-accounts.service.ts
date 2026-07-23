import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdAccount,
  AuditAction,
  AuditEntity,
  Prisma,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/services/audit-logs.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import { CreateAdAccountDto } from './dto/create-ad-account.dto';
import { UpdateAdAccountDto } from './dto/update-ad-account.dto';
import { AdAccountQueryDto } from './dto/ad-account-query.dto';
import { AdAccountResponseDto } from './dto/ad-account-response.dto';

import { AdAccountMapper } from './mappers/ad-account.mapper';

import {
  AD_ACCOUNT_DEFAULT_LIMIT,
  AD_ACCOUNT_DEFAULT_PAGE,
  AD_ACCOUNT_DEFAULT_SORT_BY,
  AD_ACCOUNT_DEFAULT_SORT_ORDER,
  AD_ACCOUNT_SORT_FIELDS,
  AdAccountSortField,
} from './constants/ad-account.constants';

@Injectable()
export class AdAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly mapper: AdAccountMapper,
  ) {}

  async create(
    dto: CreateAdAccountDto,
    currentUser: JwtPayload,
  ): Promise<AdAccountResponseDto> {
    try {
      const connection =
        await this.prisma.platformConnection.findFirst({
          where: {
            id: dto.platformConnectionId,
            organizationId: currentUser.organizationId,
            deletedAt: null,
          },
        });

      if (!connection) {
        throw new NotFoundException(
          'Platform connection not found.',
        );
      }

      const existing =
        await this.prisma.adAccount.findUnique({
          where: {
            platformConnectionId_externalId: {
              platformConnectionId:
                dto.platformConnectionId,
              externalId: dto.externalId,
            },
          },
        });

      if (existing) {
        throw new ConflictException(
          'Ad account already exists.',
        );
      }

      const account =
        await this.prisma.adAccount.create({
          data: {
            organizationId:
              currentUser.organizationId,
            platformConnectionId:
              dto.platformConnectionId,
            platform: dto.platform,
            externalId: dto.externalId,
            externalName: dto.externalName,
            externalStatus: dto.externalStatus,
            accountName: dto.accountName,
            accountNumber: dto.accountNumber,
            currency: dto.currency,
            timezone: dto.timezone,
            status: dto.status,
            isActive: dto.isActive ?? true,
            spend: dto.spend,
            impressions: dto.impressions,
            clicks: dto.clicks,
            conversions: dto.conversions,
            metadata: dto.metadata,
          },
        });

      await this.auditLogsService.log({
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        action: AuditAction.PLATFORM_CONNECTED,
        entity: AuditEntity.AD_ACCOUNT,
        entityId: account.id,
        metadata: {
          accountName: account.accountName,
          externalId: account.externalId,
        },
      });

      return this.mapper.toResponse(account);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }
    async findAll(
    query: AdAccountQueryDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<AdAccountResponseDto>> {
    const page =
      query.page ?? AD_ACCOUNT_DEFAULT_PAGE;

    const limit =
      query.limit ?? AD_ACCOUNT_DEFAULT_LIMIT;

    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(
      query,
      currentUser,
    );

    const sortField = this.ensureValidSortField(
      query.sortBy,
    );

    const [accounts, total] =
      await this.prisma.$transaction([
        this.prisma.adAccount.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [sortField]:
              query.sortOrder ??
              AD_ACCOUNT_DEFAULT_SORT_ORDER,
          },
        }),
        this.prisma.adAccount.count({
          where,
        }),
      ]);

    return {
      data: this.mapper.toResponseList(accounts),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage:
          page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(
    id: string,
    currentUser: JwtPayload,
  ): Promise<AdAccountResponseDto> {
    const account =
      await this.getAdAccountOrThrow(
        id,
        currentUser,
      );

    return this.mapper.toResponse(account);
  }
    async update(
    id: string,
    dto: UpdateAdAccountDto,
    currentUser: JwtPayload,
  ): Promise<AdAccountResponseDto> {
    try {
      const existing = await this.getAdAccountOrThrow(
        id,
        currentUser,
      );

      if (
        dto.version !== undefined &&
        existing.version !== dto.version
      ) {
        throw new ConflictException(
          'Ad account has been modified by another request.',
        );
      }

      const account = await this.prisma.adAccount.update({
        where: {
          id,
        },
        data: {
          platformConnectionId: dto.platformConnectionId,
          platform: dto.platform,
          externalId: dto.externalId,
          externalName: dto.externalName,
          externalStatus: dto.externalStatus,
          accountName: dto.accountName,
          accountNumber: dto.accountNumber,
          currency: dto.currency,
          timezone: dto.timezone,
          status: dto.status,
          isActive: dto.isActive,
          spend: dto.spend,
          impressions: dto.impressions,
          clicks: dto.clicks,
          conversions: dto.conversions,
          metadata: dto.metadata,
          version: {
            increment: 1,
          },
        },
      });

      await this.auditLogsService.log({
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        action: AuditAction.PLATFORM_CONNECTED,
        entity: AuditEntity.AD_ACCOUNT,
        entityId: account.id,
        metadata: {
          accountName: account.accountName,
          externalId: account.externalId,
        },
      });

      return this.mapper.toResponse(account);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }
    async remove(
    id: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    try {
      const account = await this.getAdAccountOrThrow(
        id,
        currentUser,
      );

      await this.prisma.adAccount.update({
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
        action: AuditAction.PLATFORM_DISCONNECTED,
        entity: AuditEntity.AD_ACCOUNT,
        entityId: account.id,
        metadata: {
          accountName: account.accountName,
          externalId: account.externalId,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }
    private async getAdAccountOrThrow(
    id: string,
    currentUser: JwtPayload,
  ): Promise<AdAccount> {
    const account = await this.prisma.adAccount.findFirst({
      where: {
        id,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
    });

    if (!account) {
      throw new NotFoundException(
        'Ad account not found.',
      );
    }

    return account;
  }

  private buildWhereClause(
    query: AdAccountQueryDto,
    currentUser: JwtPayload,
  ): Prisma.AdAccountWhereInput {
    const where: Prisma.AdAccountWhereInput = {
      organizationId: currentUser.organizationId,
      deletedAt: null,
    };

    if (query.platformConnectionId) {
      where.platformConnectionId =
        query.platformConnectionId;
    }

    if (query.platform) {
      where.platform = query.platform;
    }

    if (query.currency) {
      where.currency = query.currency;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        {
          accountName: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          externalId: {
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
          accountNumber: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return where;
  }

  private ensureValidSortField(
    field: string,
  ): AdAccountSortField {
    if (
      AD_ACCOUNT_SORT_FIELDS.includes(
        field as AdAccountSortField,
      )
    ) {
      return field as AdAccountSortField;
    }

    throw new BadRequestException(
      `Invalid sort field: ${field}`,
    );
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof PrismaClientKnownRequestError
    ) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException(
            'An ad account with the same values already exists.',
          );

        case 'P2025':
          throw new NotFoundException(
            'Ad account not found.',
          );
      }
    }

    throw error;
  }
}