import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntity,
  PlatformCredential,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import { AuditLogsService } from '../audit-logs/services/audit-logs.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { PlatformCredentialMapper } from './mappers/platform-credential.mapper';

import { CreatePlatformCredentialDto } from './dto/create-platform-credential.dto';
import { UpdatePlatformCredentialDto } from './dto/update-platform-credential.dto';
import { PlatformCredentialQueryDto } from './dto/platform-credential-query.dto';
import { PlatformCredentialResponseDto } from './dto/platform-credential-response.dto';

import {
  PLATFORM_CREDENTIAL_SORT_FIELDS,
  PlatformCredentialSortField,
} from './constants/platform-credential.constants';

@Injectable()
export class PlatformCredentialsService implements OnModuleInit {
  private readonly logger = new Logger(PlatformCredentialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: PlatformCredentialMapper,
    private readonly auditLogsService: AuditLogsService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.encryptExistingPlaintextCredentials();
  }

  async create(
    dto: CreatePlatformCredentialDto,
    currentUser: JwtPayload,
  ): Promise<PlatformCredentialResponseDto> {
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

      const credential =
        await this.prisma.platformCredential.create({
          data: {
            platformConnectionId: dto.platformConnectionId,
            accessToken: this.encryptionService.encrypt(dto.accessToken),
            refreshToken: dto.refreshToken
              ? this.encryptionService.encrypt(dto.refreshToken)
              : null,
            expiresAt: dto.expiresAt
              ? new Date(dto.expiresAt)
              : null,
            scopes: dto.scopes,
            isActive: dto.isActive ?? true,
            revokedAt: dto.revokedAt
              ? new Date(dto.revokedAt)
              : null,
            revokedReason: dto.revokedReason,
            rotatedAt: dto.rotatedAt
              ? new Date(dto.rotatedAt)
              : null,
          },
        });

      await this.auditLogsService.log({
        action: AuditAction.PLATFORM_CONNECTED,
        entity: AuditEntity.PLATFORM,
        entityId: credential.id,
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        metadata: {
          platformConnectionId:
            credential.platformConnectionId,
        },

      });

      return this.mapper.toResponse(credential);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }
    async findAll(
    query: PlatformCredentialQueryDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<PlatformCredentialResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query, currentUser);

    const sortField = this.ensureValidSortField(query.sortBy);

    const [credentials, total] = await this.prisma.$transaction([
      this.prisma.platformCredential.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortField]: query.sortOrder,
        },
      }),
      this.prisma.platformCredential.count({
        where,
      }),
    ]);

    return {
      data: this.mapper.toResponseList(credentials),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(
    id: string,
    currentUser: JwtPayload,
  ): Promise<PlatformCredentialResponseDto> {
    const credential = await this.getCredentialOrThrow(
      id,
      currentUser,
    );

    return this.mapper.toResponse(credential);
  }
    async update(
    id: string,
    dto: UpdatePlatformCredentialDto,
    currentUser: JwtPayload,
  ): Promise<PlatformCredentialResponseDto> {
    try {
      const existing = await this.getCredentialOrThrow(
        id,
        currentUser,
      );

      if (
        dto.version !== undefined &&
        existing.version !== dto.version
      ) {
        throw new ConflictException(
          'Platform credential has been modified by another request.',
        );
      }

      const credential =
        await this.prisma.platformCredential.update({
          where: {
            id,
          },
          data: {
            accessToken:
              dto.accessToken !== undefined
                ? this.encryptionService.encrypt(dto.accessToken)
                : undefined,
            refreshToken:
              dto.refreshToken !== undefined
                ? dto.refreshToken
                  ? this.encryptionService.encrypt(dto.refreshToken)
                  : null
                : undefined,
            expiresAt: dto.expiresAt
              ? new Date(dto.expiresAt)
              : undefined,
            scopes: dto.scopes,
            isActive: dto.isActive,
            revokedAt: dto.revokedAt
              ? new Date(dto.revokedAt)
              : undefined,
            revokedReason: dto.revokedReason,
            rotatedAt: dto.rotatedAt
              ? new Date(dto.rotatedAt)
              : undefined,
            version: {
              increment: 1,
            },
          },
        });

      await this.auditLogsService.log({
        action: AuditAction.PLATFORM_CONNECTED,
        entity: AuditEntity.PLATFORM,
        entityId: credential.id,
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        metadata: {
          platformConnectionId:
            credential.platformConnectionId,
        },
      });

      return this.mapper.toResponse(credential);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }
    async remove(
    id: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    try {
      const credential = await this.getCredentialOrThrow(
        id,
        currentUser,
      );

      await this.prisma.platformCredential.update({
        where: {
          id,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: 'Credential removed',
          version: {
            increment: 1,
          },
        },
      });

      await this.auditLogsService.log({
        action: AuditAction.PLATFORM_DISCONNECTED,
        entity: AuditEntity.PLATFORM,
        entityId: credential.id,
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        metadata: {
          platformConnectionId:
            credential.platformConnectionId,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }
    private async getCredentialOrThrow(
    id: string,
    currentUser: JwtPayload,
  ): Promise<PlatformCredential> {
    const credential =
      await this.prisma.platformCredential.findFirst({
        where: {
          id,
          platformConnection: {
            organizationId: currentUser.organizationId,
            deletedAt: null,
          },
        },
      });

    if (!credential) {
      throw new NotFoundException(
        'Platform credential not found.',
      );
    }

    return credential;
  }

  private buildWhereClause(
    query: PlatformCredentialQueryDto,
    currentUser: JwtPayload,
  ): Prisma.PlatformCredentialWhereInput {
    const where: Prisma.PlatformCredentialWhereInput = {
      platformConnection: {
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
    };

    if (query.platformConnectionId) {
      where.platformConnectionId = query.platformConnectionId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        {
          revokedReason: {
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
  ): PlatformCredentialSortField {
    if (
      PLATFORM_CREDENTIAL_SORT_FIELDS.includes(
        field as PlatformCredentialSortField,
      )
    ) {
      return field as PlatformCredentialSortField;
    }

    throw new BadRequestException(
      `Invalid sort field: ${field}`,
    );
  }

  private async encryptExistingPlaintextCredentials(): Promise<void> {
    const credentials = await this.prisma.platformCredential.findMany({
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
      },
    });

    let migrated = 0;

    for (const credential of credentials) {
      const accessToken = this.ensureEncrypted(credential.accessToken);
      const refreshToken = credential.refreshToken
        ? this.ensureEncrypted(credential.refreshToken)
        : null;

      const accessChanged = accessToken !== credential.accessToken;
      const refreshChanged = refreshToken !== credential.refreshToken;

      if (!accessChanged && !refreshChanged) {
        continue;
      }

      await this.prisma.platformCredential.update({
        where: { id: credential.id },
        data: {
          accessToken,
          refreshToken,
        },
      });
      migrated += 1;
    }

    if (migrated > 0) {
      this.logger.log(
        `Encrypted ${migrated} existing platform credential record(s).`,
      );
    }
  }

  private ensureEncrypted(value: string): string {
    if (this.looksEncrypted(value)) {
      return value;
    }

    return this.encryptionService.encrypt(value);
  }

  private looksEncrypted(value: string): boolean {
    const parts = value.split(':');
    if (parts.length !== 3) {
      return false;
    }

    return parts.every((part) => /^[0-9a-f]+$/i.test(part) && part.length > 0);
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException(
            'A platform credential with the same values already exists.',
          );

        case 'P2025':
          throw new NotFoundException(
            'Platform credential not found.',
          );
      }
    }

    throw error;
  }
}