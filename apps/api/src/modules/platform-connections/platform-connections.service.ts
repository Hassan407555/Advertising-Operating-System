import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  PLATFORM_CONNECTION_INCLUDE,
  PlatformConnectionWithRelations,
} from './constants/platform-connection.constants';
import {
  AuditAction,
  AuditEntity,
  ConnectionStatus,
  PlatformType,
  SyncStatus,
  Prisma,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/services/audit-logs.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import { CreatePlatformConnectionDto } from './dto/create-platform-connection.dto';
import { UpdatePlatformConnectionDto } from './dto/update-platform-connection.dto';
import { PlatformConnectionQueryDto } from './dto/platform-connection-query.dto';
import { PlatformConnectionResponseDto } from './dto/platform-connection-response.dto';

import { PlatformConnectionMapper } from './mappers/platform-connection.mapper';
const ALLOWED_SORT_FIELDS = [
  'accountName',
  'platform',
  'status',
  'syncStatus',
  'createdAt',
  'updatedAt',
  'lastSyncedAt',
] as const;

type SortField = (typeof ALLOWED_SORT_FIELDS)[number];

@Injectable()
export class PlatformConnectionsService {
  private readonly logger = new Logger(PlatformConnectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly platformConnectionMapper: PlatformConnectionMapper,
  ) {}

  async create(
    createDto: CreatePlatformConnectionDto,
    currentUser: JwtPayload,
  ): Promise<PlatformConnectionResponseDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.verifyDuplicateConnection(
          createDto.platform,
          createDto.accountId,
          currentUser.organizationId,
          tx,
        );

        const connection = await tx.platformConnection.create({
          data: {
            organizationId: currentUser.organizationId,
            createdByUserId: currentUser.sub,

            platform: createDto.platform,
            accountId: createDto.accountId,
            accountName: createDto.accountName,
            externalName: createDto.externalName,

            webhookUrl: createDto.webhookUrl,
            webhookSecret: createDto.webhookSecret,

            metadata: createDto.metadata,

            status: ConnectionStatus.ACTIVE,
            version: 1,
          },

          include: PLATFORM_CONNECTION_INCLUDE,
        });

        await this.auditLogsService.log(
          {
            organizationId: currentUser.organizationId,
            actorId: currentUser.sub,
            action: AuditAction.PLATFORM_CONNECTED,
            entity: AuditEntity.PLATFORM,
            entityId: connection.id,
            metadata: {
              platform: connection.platform,
              accountName: connection.accountName,
              accountId: connection.accountId,
            },
          },
          tx,
        );

        this.logger.log(
          {
            msg: 'Platform connection created',
            connectionId: connection.id,
            organizationId: currentUser.organizationId,
            userId: currentUser.sub,
          },
          PlatformConnectionsService.name,
        );

        return this.platformConnectionMapper.toResponse(connection);
      });
    } catch (error) {
      this.handlePrismaError(error, {
        platform: createDto.platform,
        accountId: createDto.accountId,
      });

      throw error;
    }
  }

  async findAll(
    query: PlatformConnectionQueryDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<PlatformConnectionResponseDto>> {
    const {
      page,
      limit,
      search,
      platform,
      status,
      syncStatus,
      sortBy,
      sortOrder,
    } = query;

    const safeSortBy = this.ensureValidSortField(sortBy);

    const where = this.buildWhereClause({
      organizationId: currentUser.organizationId,
      search,
      platform,
      status,
      syncStatus,
    });

    const skip = (page - 1) * limit;

    const [connections, total] = await this.prisma.$transaction([
      this.prisma.platformConnection.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [safeSortBy]: sortOrder,
        },
        include: PLATFORM_CONNECTION_INCLUDE,
      }),

      this.prisma.platformConnection.count({
        where,
      }),
    ]);

    return {
      data: this.platformConnectionMapper.toResponseArray(connections),

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
  ): Promise<PlatformConnectionResponseDto> {
const connection = await this.getConnectionOrThrow(
  id,
  currentUser.organizationId,
);

return this.platformConnectionMapper.toResponse(connection);  }

  async update(
    id: string,
    updateDto: UpdatePlatformConnectionDto,
    currentUser: JwtPayload,
  ): Promise<PlatformConnectionResponseDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await this.getConnectionOrThrow(
          id,
          currentUser.organizationId,
          tx,
        );

        if (
          updateDto.platform &&
          updateDto.accountId &&
          (updateDto.platform !== existing.platform ||
            updateDto.accountId !== existing.accountId)
        ) {
          await this.verifyDuplicateConnection(
            updateDto.platform,
            updateDto.accountId,
            currentUser.organizationId,
            tx,
            id,
          );
        }

        if (
          updateDto.version !== undefined &&
          existing.version !== updateDto.version
        ) {
          throw new ConflictException(
            'This platform connection has been modified by another user. Please refresh and try again.',
          );
        }

        const connection = await tx.platformConnection.update({
          where: {
            id,
          },
          data: {
            accountName: updateDto.accountName,
            externalName: updateDto.externalName,
            webhookUrl: updateDto.webhookUrl,
            webhookSecret: updateDto.webhookSecret,
            metadata: updateDto.metadata,

            version: {
              increment: 1,
            },
          },
          include: PLATFORM_CONNECTION_INCLUDE,
        });

        await this.auditLogsService.log(
          {
            organizationId: currentUser.organizationId,
            actorId: currentUser.sub,
            action: AuditAction.PLATFORM_CONNECTED,
            entity: AuditEntity.PLATFORM,
            entityId: connection.id,
            metadata: {
              accountName: connection.accountName,
              platform: connection.platform,
            },
          },
          tx,
        );

        this.logger.log({
          msg: 'Platform connection updated',
          connectionId: connection.id,
          organizationId: currentUser.organizationId,
        });

        return this.platformConnectionMapper.toResponse(connection);
      });
    } catch (error) {
      this.handlePrismaError(error, { id });

      throw error;
    }
  }

  async remove(id: string, currentUser: JwtPayload): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const connection = await this.getConnectionOrThrow(
          id,
          currentUser.organizationId,
          tx,
        );

        await tx.platformConnection.update({
          where: {
            id,
          },
          data: {
            deletedAt: new Date(),
            status: ConnectionStatus.INACTIVE,
            version: {
              increment: 1,
            },
          },
        });

        await this.auditLogsService.log(
          {
            organizationId: currentUser.organizationId,
            actorId: currentUser.sub,
            action: AuditAction.PLATFORM_DISCONNECTED,
            entity: AuditEntity.PLATFORM,
            entityId: id,
            metadata: {
              platform: connection.platform,
              accountName: connection.accountName,
            },
          },
          tx,
        );

        this.logger.log({
          msg: 'Platform connection removed',
          connectionId: id,
          organizationId: currentUser.organizationId,
        });
      });
    } catch (error) {
      this.handlePrismaError(error, { id });

      throw error;
    }
  }

  private async verifyDuplicateConnection(
    platform: PlatformType,
    accountId: string,
    organizationId: string,
    tx: Prisma.TransactionClient,
    excludeId?: string,
  ): Promise<void> {
    const existing = await tx.platformConnection.findFirst({
      where: {
        organizationId,
        platform,
        accountId,
        deletedAt: null,
        ...(excludeId
          ? {
              id: {
                not: excludeId,
              },
            }
          : {}),
      },
    });

    if (existing) {
      throw new ConflictException(
        'A platform connection with this account already exists.',
      );
    }
  }

  private async getConnectionOrThrow(
  id: string,
  organizationId: string,
  tx: Prisma.TransactionClient = this.prisma,
): Promise<PlatformConnectionWithRelations> {
  const connection = await tx.platformConnection.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
    include: PLATFORM_CONNECTION_INCLUDE,
  });

  if (!connection) {
    throw new NotFoundException('Platform connection not found.');
  }

  return connection;
}
private ensureValidSortField(sortBy?: string): SortField {
  return ALLOWED_SORT_FIELDS.includes(sortBy as SortField)
    ? (sortBy as SortField)
    : 'createdAt';
}

private buildWhereClause(filters: {
  organizationId: string;
  search?: string;
  platform?: PlatformType;
  status?: ConnectionStatus;
syncStatus?: SyncStatus;}):
 Prisma.PlatformConnectionWhereInput {
  const {
    organizationId,
    search,
    platform,
    status,
    syncStatus,
  } = filters;

  return {
    organizationId,
    deletedAt: null,

    ...(platform && { platform }),
    ...(status && { status }),
    ...(syncStatus && { syncStatus }),

    ...(search
      ? {
          OR: [
            {
              accountName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              accountId: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              externalName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : {}),
  };
}

private handlePrismaError(
  error: unknown,
  context?: Record<string, unknown>,
): never {
  this.logger.error(
    'PlatformConnectionsService Error',
    error instanceof Error ? error.stack : String(error),
    JSON.stringify(context),
  );

  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new ConflictException(
          'Platform connection already exists.',
        );

      case 'P2025':
        throw new NotFoundException(
          'Platform connection not found.',
        );
    }
  }

  if (
    error instanceof ConflictException ||
    error instanceof NotFoundException ||
    error instanceof BadRequestException
  ) {
    throw error;
  }

  throw error;
}
}