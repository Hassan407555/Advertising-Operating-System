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
  CreativeAssetType,
  Prisma,
} from '@prisma/client';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import { AuditLogsService } from '../../audit-logs/services/audit-logs.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { StorageService } from './storage.service';

import { StorageMapper } from '../mappers/storage.mapper';

import { UploadFileDto } from '../dto/upload-file.dto';
import { UploadMultipleFilesDto } from '../dto/upload-multiple-files.dto';
import { StorageResponseDto } from '../dto/storage-response.dto';

@Injectable()
export class StorageAssetsService {
  private readonly logger = new Logger(StorageAssetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly mapper: StorageMapper,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Upload a single file.
   */
  async upload(
    file: Express.Multer.File,
    dto: UploadFileDto,
    currentUser: JwtPayload,
  ): Promise<StorageResponseDto> {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded.',
      );
    }

    const uploadResult =
      await this.storageService.upload(
        file.buffer,
        file.originalname,
        {
          directory: dto.directory,
          mimeType: file.mimetype,
        },
      );

try {
  const asset = await this.prisma.creativeAsset.create({
    data: {
      organizationId: currentUser.organizationId,

      creativeId: dto.creativeId || undefined,

      adId: dto.adId || undefined,

      assetType:
        dto.assetType ??
        CreativeAssetType.IMAGE,

      storageProvider:
        uploadResult.storageProvider,

      fileName:
        uploadResult.fileName,

      originalFileName:
        uploadResult.originalFileName,

      storageKey:
        uploadResult.storageKey,

      url:
        uploadResult.url,

      mimeType:
        uploadResult.mimeType,

      extension:
        uploadResult.extension,

      checksum:
        uploadResult.checksum,

      fileSize:
        BigInt(uploadResult.size),

      isPrimary:
        dto.isPrimary ?? false,
    },
  });

  await this.auditLogsService.log({
    organizationId: currentUser.organizationId,

    actorId: currentUser.sub,

    action:
      AuditAction.CREATIVE_ASSET_CREATED,

    entity:
      AuditEntity.CREATIVE_ASSET,

    entityId:
      asset.id,

    metadata: {
      fileName: asset.fileName,
      assetType: asset.assetType,
    },
  });

  return this.mapper.toResponse(asset);
} catch (error) {
  this.logger.error(
    `Failed to persist creative asset for organization ${currentUser.organizationId}`,
    error instanceof Error ? error.stack : undefined,
  );

  await this.storageService.delete(
    uploadResult.storageKey,
  );

  this.handlePrismaError(error);
}
  }
    /**
   * Upload multiple files.
   */
  async uploadMultiple(
    files: Express.Multer.File[],
    dto: UploadMultipleFilesDto,
    currentUser: JwtPayload,
  ): Promise<StorageResponseDto[]> {
    if (!files?.length) {
      throw new BadRequestException(
        'No files uploaded.',
      );
    }

    const results: StorageResponseDto[] = [];

    for (const file of files) {
      const asset = await this.upload(
        file,
        dto,
        currentUser,
      );

      results.push(asset);
    }

    return results;
  }

  /**
   * Get a storage asset by id.
   */
  async findOne(
    id: string,
    currentUser: JwtPayload,
  ): Promise<StorageResponseDto> {
    const asset =
      await this.prisma.creativeAsset.findFirst({
        where: {
          id,
          organizationId:
            currentUser.organizationId,
          deletedAt: null,
        },
      });

    if (!asset) {
      throw new NotFoundException(
        'Storage asset not found.',
      );
    }

    return this.mapper.toResponse(asset);
  }

  /**
   * Get a storage asset entity.
   * Internal helper.
   */
  private async findAsset(
    id: string,
    organizationId: string,
  ) {
    const asset =
      await this.prisma.creativeAsset.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
      });

    if (!asset) {
      throw new NotFoundException(
        'Storage asset not found.',
      );
    }

    return asset;
  }
    /**
   * Soft delete a storage asset.
   */
  async remove(
    id: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    const asset = await this.findAsset(
      id,
      currentUser.organizationId,
    );

    try {
      await this.storageService.delete(
        asset.storageKey,
      );

      await this.prisma.creativeAsset.update({
        where: {
          id: asset.id,
        },
        data: {
          deletedAt: new Date(),
          version: {
            increment: 1,
          },
        },
      });

      await this.auditLogsService.log({
        organizationId:
          currentUser.organizationId,

        actorId:
          currentUser.sub,

        action:
          AuditAction.CREATIVE_ASSET_DELETED,

        entity:
          AuditEntity.CREATIVE_ASSET,

        entityId:
          asset.id,

        metadata: {
          fileName: asset.fileName,
          storageKey: asset.storageKey,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Handle Prisma exceptions.
   */
  private handlePrismaError(
    error: unknown,
  ): never {
    if (
      error instanceof
      PrismaClientKnownRequestError
    ) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException(
            'A storage asset with the same unique values already exists.',
          );

        case 'P2025':
          throw new NotFoundException(
            'Storage asset not found.',
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