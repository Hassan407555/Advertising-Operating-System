import { Injectable } from '@nestjs/common';
import { CreativeAsset } from '@prisma/client';

import { StorageResponseDto } from '../dto/storage-response.dto';

@Injectable()
export class StorageMapper {
  toResponse(
    asset: CreativeAsset,
  ): StorageResponseDto {
    return {
      id: asset.id,

      fileName: asset.fileName,

      originalFileName: asset.originalFileName,

      storageKey: asset.storageKey,

      url: asset.url,

      mimeType: asset.mimeType,

      extension: asset.extension,

      fileSize: Number(asset.fileSize),

      assetType: asset.assetType,

      storageProvider: asset.storageProvider,

      createdAt: asset.createdAt,
    };
  }

  toResponseList(
    assets: CreativeAsset[],
  ): StorageResponseDto[] {
    return assets.map(asset =>
      this.toResponse(asset),
    );
  }
}