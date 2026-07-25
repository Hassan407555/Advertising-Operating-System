import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { StorageService } from '../../storage/services/storage.service';

import { CreativeAssetsService } from '../creative-assets.service';
import { FileValidationService } from './file-validation.service';
import { ChecksumService } from './checksum.service';

import { UploadAssetDto } from '../dto/upload-asset.dto';
import { CreateCreativeAssetDto } from '../dto/create-creative-asset.dto';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class AssetUploadService {
  constructor(
    private readonly storageService: StorageService,
    private readonly creativeAssetsService: CreativeAssetsService,
    private readonly fileValidationService: FileValidationService,
    private readonly checksumService: ChecksumService,
  ) {}

  async upload(
    file: Express.Multer.File,
    dto: UploadAssetDto,
    currentUser: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    this.fileValidationService.validate(file);

    const checksum = this.checksumService.sha256(
      file.buffer,
    );

    const existing =
      await this.creativeAssetsService.findByChecksum(
        checksum,
        currentUser.organizationId,
      );

    if (existing) {
      return existing;
    }

    const upload =
      await this.storageService.upload(
        file.buffer,
        file.originalname,
        {
          directory:
            dto.directory ??
            `organizations/${currentUser.organizationId}/creative-assets`,
          mimeType: file.mimetype,
          metadata: this.buildMetadata(
            dto.metadata,
          ),
        },
      );

    try {
      const createDto: CreateCreativeAssetDto = {
        creativeId: dto.creativeId,
        adId: dto.adId,

        assetType: dto.assetType,
        storageProvider:
          upload.storageProvider,

        fileName: upload.fileName,
        originalFileName:
          upload.originalFileName,

        storageKey: upload.storageKey,

        url: upload.url,
        thumbnailUrl: undefined,

        mimeType: upload.mimeType,
        extension: upload.extension,

        checksum,

        width: undefined,
        height: undefined,
        duration: undefined,

        fileSize: upload.size,

        displayOrder:
          dto.displayOrder ?? 0,

        isPrimary:
          dto.isPrimary ?? false,

        metadata: dto.metadata,
      };

      return await this.creativeAssetsService.createFromUpload(
        createDto,
        currentUser,
      );
    } catch (error) {
      await this.storageService.delete(
        upload.storageKey,
      );

      throw error;
    }
  }

  private buildMetadata(
    metadata?: Record<string, unknown>,
  ): Record<string, string> | undefined {
    if (!metadata) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(metadata).map(
        ([key, value]) => [
          key,
          String(value),
        ],
      ),
    );
  }
}