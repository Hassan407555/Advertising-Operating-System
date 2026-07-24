import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AuditAction,
  AuditEntity,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

import { AuditLogsService } from '../audit-logs/services/audit-logs.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

import { CreateCreativeAssetDto } from './dto/create-creative-asset.dto';
import { UpdateCreativeAssetDto } from './dto/update-creative-asset.dto';
import { QueryCreativeAssetsDto } from './dto/query-creative-assets.dto';
import { CreativeAssetResponseDto } from './dto/creative-asset-response.dto';

import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  CREATIVE_ASSET_SORT_FIELDS,
  CREATIVE_ASSET_INCLUDE,
} from './constants/creative-assets.constants';

import { CreativeAssetMapper } from './mapper/creative-asset.mapper';

@Injectable()
export class CreativeAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: CreativeAssetMapper,
    private readonly auditLogsService: AuditLogsService,
  ) {}
  async create(
    dto: CreateCreativeAssetDto,
    currentUser: JwtPayload,
  ): Promise<CreativeAssetResponseDto> {
    try {
      const asset = await this.prisma.creativeAsset.create({
        data: {
          organizationId: currentUser.organizationId,

          creativeId: dto.creativeId,
          adId: dto.adId,

          assetType: dto.assetType,
          storageProvider: dto.storageProvider,

          fileName: dto.fileName,
          originalFileName: dto.originalFileName,

          storageKey: dto.storageKey,

          url: dto.url,
          thumbnailUrl: dto.thumbnailUrl,

          mimeType: dto.mimeType,
          extension: dto.extension,

          checksum: dto.checksum,

          width: dto.width,
          height: dto.height,

          fileSize: dto.fileSize,
          duration: dto.duration,

          displayOrder: dto.displayOrder ?? 0,
          isPrimary: dto.isPrimary ?? false,

          metadata: dto.metadata as Prisma.InputJsonValue,
        },
        include: CREATIVE_ASSET_INCLUDE,
      });

      await this.auditLogsService.log({
        organizationId: currentUser.organizationId,
        actorId: currentUser.sub,
        action: AuditAction.CREATIVE_ASSET_CREATED,
        entity: AuditEntity.CREATIVE_ASSET,
        entityId: asset.id,
        metadata: {
          fileName: asset.fileName,
          assetType: asset.assetType,
          creativeId: asset.creativeId,
          adId: asset.adId,
        },
      });

      return this.mapper.toResponse(asset);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }
  async findAll(
  query: QueryCreativeAssetsDto,
  currentUser: JwtPayload,
): Promise<PaginatedResponseDto<CreativeAssetResponseDto>> {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = query.limit ?? DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  const where: Prisma.CreativeAssetWhereInput = {
    organizationId: currentUser.organizationId,
    deletedAt: null,
  };

  if (query.search) {
    where.OR = [
      {
        fileName: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
      {
        originalFileName: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
      {
        storageKey: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
      {
        url: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  if (query.assetType) {
    where.assetType = query.assetType;
  }

  if (query.storageProvider) {
    where.storageProvider = query.storageProvider;
  }

  if (query.creativeId) {
    where.creativeId = query.creativeId;
  }

  if (query.adId) {
    where.adId = query.adId;
  }

  if (query.isPrimary !== undefined) {
    where.isPrimary = query.isPrimary;
  }

  

  const sortBy = CREATIVE_ASSET_SORT_FIELDS.includes(
    query.sortBy as any,
  )
    ? query.sortBy!
    : DEFAULT_SORT_BY;

  const sortOrder = query.sortOrder ?? DEFAULT_SORT_ORDER;

  const [assets, total] = await this.prisma.$transaction([
    this.prisma.creativeAsset.findMany({
      where,
      include: CREATIVE_ASSET_INCLUDE,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),

    this.prisma.creativeAsset.count({
      where,
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(total / limit),
  );

  return {
    data: this.mapper.toResponseList(assets),
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
): Promise<CreativeAssetResponseDto> {
  const asset = await this.prisma.creativeAsset.findFirst({
    where: {
      id,
      organizationId: currentUser.organizationId,
      deletedAt: null,
    },
    include: CREATIVE_ASSET_INCLUDE,
  });

  if (!asset) {
    throw new NotFoundException('Creative asset not found.');
  }

  return this.mapper.toResponse(asset);
}
async update(
  id: string,
  dto: UpdateCreativeAssetDto,
  currentUser: JwtPayload,
): Promise<CreativeAssetResponseDto> {
  const existing = await this.prisma.creativeAsset.findFirst({
    where: {
      id,
      organizationId: currentUser.organizationId,
      deletedAt: null,
    },
  });

  if (!existing) {
    throw new NotFoundException('Creative asset not found.');
  }

  if (dto.version !== existing.version) {
    throw new ConflictException(
      'Creative asset has been modified by another user.',
    );
  }

  const { version, ...updateData } = dto;

  try {
    const result = await this.prisma.creativeAsset.updateMany({
      where: {
        id,
        organizationId: currentUser.organizationId,
        deletedAt: null,
        version: dto.version,
      },
      data: {
        ...updateData,

        metadata:
          dto.metadata !== undefined
            ? (dto.metadata as Prisma.InputJsonValue)
            : undefined,

        version: {
          increment: 1,
        },
      },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'Creative asset has been modified by another user.',
      );
    }

    const asset = await this.prisma.creativeAsset.findUniqueOrThrow({
      where: {
        id,
      },
      include: CREATIVE_ASSET_INCLUDE,
    });

    await this.auditLogsService.log({
      organizationId: currentUser.organizationId,
      actorId: currentUser.sub,
      action: AuditAction.CREATIVE_ASSET_UPDATED,
      entity: AuditEntity.CREATIVE_ASSET,
      entityId: asset.id,
      metadata: {
        fileName: asset.fileName,
        assetType: asset.assetType,
        creativeId: asset.creativeId,
        adId: asset.adId,
      },
    });

    return this.mapper.toResponse(asset);
  } catch (error) {
    this.handlePrismaError(error);
  }
}
async remove(
  id: string,
  currentUser: JwtPayload,
): Promise<void> {
  const asset = await this.prisma.creativeAsset.findFirst({
    where: {
      id,
      organizationId: currentUser.organizationId,
      deletedAt: null,
    },
  });

  if (!asset) {
    throw new NotFoundException('Creative asset not found.');
  }

  try {
    await this.prisma.creativeAsset.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),

        isPrimary: false,

        version: {
          increment: 1,
        },
      },
    });

    await this.auditLogsService.log({
      organizationId: currentUser.organizationId,
      actorId: currentUser.sub,
      action: AuditAction.CREATIVE_ASSET_DELETED,
      entity: AuditEntity.CREATIVE_ASSET,
      entityId: id,
      metadata: {
        fileName: asset.fileName,
        assetType: asset.assetType,
        creativeId: asset.creativeId,
        adId: asset.adId,
      },
    });
  } catch (error) {
    this.handlePrismaError(error);
  }
}
async archive(
  id: string,
  currentUser: JwtPayload,
): Promise<CreativeAssetResponseDto> {
  const asset = await this.prisma.creativeAsset.findFirst({
    where: {
      id,
      organizationId: currentUser.organizationId,
      deletedAt: null,
    },
  });

  if (!asset) {
    throw new NotFoundException('Creative asset not found.');
  }

  if (asset.archivedAt) {
    throw new BadRequestException(
      'Creative asset is already archived.',
    );
  }

  const updated = await this.prisma.creativeAsset.update({
    where: {
      id,
    },
    data: {
      archivedAt: new Date(),
      version: {
        increment: 1,
      },
    },
    include: CREATIVE_ASSET_INCLUDE,
  });

  await this.auditLogsService.log({
    organizationId: currentUser.organizationId,
    actorId: currentUser.sub,
    action: AuditAction.CREATIVE_ASSET_ARCHIVED,
    entity: AuditEntity.CREATIVE_ASSET,
    entityId: updated.id,
    metadata: {
      fileName: updated.fileName,
      assetType: updated.assetType,
    },
  });

  return this.mapper.toResponse(updated);
}

async restore(
  id: string,
  currentUser: JwtPayload,
): Promise<CreativeAssetResponseDto> {
  const asset = await this.prisma.creativeAsset.findFirst({
    where: {
      id,
      organizationId: currentUser.organizationId,
      deletedAt: null,
    },
  });

  if (!asset) {
    throw new NotFoundException('Creative asset not found.');
  }

  if (!asset.archivedAt) {
    throw new BadRequestException(
      'Creative asset is not archived.',
    );
  }

  const updated = await this.prisma.creativeAsset.update({
    where: {
      id,
    },
    data: {
      archivedAt: null,
      version: {
        increment: 1,
      },
    },
    include: CREATIVE_ASSET_INCLUDE,
  });

  await this.auditLogsService.log({
    organizationId: currentUser.organizationId,
    actorId: currentUser.sub,
    action: AuditAction.CREATIVE_ASSET_RESTORED,
    entity: AuditEntity.CREATIVE_ASSET,
    entityId: updated.id,
    metadata: {
      fileName: updated.fileName,
      assetType: updated.assetType,
    },
  });

  return this.mapper.toResponse(updated);
}
async setPrimary(
  id: string,
  currentUser: JwtPayload,
): Promise<CreativeAssetResponseDto> {
  const asset = await this.prisma.creativeAsset.findFirst({
    where: {
      id,
      organizationId: currentUser.organizationId,
      deletedAt: null,
    },
  });

  if (!asset) {
    throw new NotFoundException('Creative asset not found.');
  }

  await this.prisma.$transaction(async (tx) => {
    if (asset.creativeId) {
await tx.creativeAsset.updateMany({
  where: {
    organizationId: currentUser.organizationId,
    creativeId: asset.creativeId,
    deletedAt: null,
  },
        data: {
          isPrimary: false,
        },
      });
    }

    if (asset.adId) {
     await tx.creativeAsset.updateMany({
  where: {
    organizationId: currentUser.organizationId,
    adId: asset.adId,
    deletedAt: null,
  },
        data: {
          isPrimary: false,
        },
      });
    }

    await tx.creativeAsset.update({
      where: {
        id,
      },
      data: {
        isPrimary: true,
        version: {
          increment: 1,
        },
      },
    });
  });

  const updated = await this.prisma.creativeAsset.findUniqueOrThrow({
    where: {
      id,
    },
    include: CREATIVE_ASSET_INCLUDE,
  });

  await this.auditLogsService.log({
    organizationId: currentUser.organizationId,
    actorId: currentUser.sub,
    action: AuditAction.CREATIVE_ASSET_PRIMARY_SET,
    entity: AuditEntity.CREATIVE_ASSET,
    entityId: updated.id,
    metadata: {
      fileName: updated.fileName,
      creativeId: updated.creativeId,
      adId: updated.adId,
    },
  });

  return this.mapper.toResponse(updated);
}
private handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new ConflictException(
          'A creative asset with the same unique values already exists.',
        );

      case 'P2025':
        throw new NotFoundException(
          'Creative asset not found.',
        );

      default:
        throw new BadRequestException(
          'Database operation failed.',
        );
    }
  }

  throw error;
}
}