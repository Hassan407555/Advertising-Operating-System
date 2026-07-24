import { Injectable } from '@nestjs/common';
import { CreativeAsset } from '@prisma/client';

import { CreativeAssetResponseDto } from '../dto/creative-asset-response.dto';

@Injectable()
export class CreativeAssetMapper {
  toResponse(asset: CreativeAsset): CreativeAssetResponseDto {
    return {
      id: asset.id,
      organizationId: asset.organizationId,
      creativeId: asset.creativeId,
      adId: asset.adId,

      assetType: asset.assetType,
      storageProvider: asset.storageProvider,

      fileName: asset.fileName,
      originalFileName: asset.originalFileName,
      storageKey: asset.storageKey,

      url: asset.url,
      thumbnailUrl: asset.thumbnailUrl,

      mimeType: asset.mimeType,
      extension: asset.extension,

      checksum: asset.checksum,

      width: asset.width,
      height: asset.height,

      // Convert BigInt -> number
      fileSize:
        asset.fileSize !== null
          ? Number(asset.fileSize)
          : null,

      // Convert Prisma.Decimal -> number
      duration:
        asset.duration !== null
          ? asset.duration.toNumber()
          : null,

      displayOrder: asset.displayOrder,
      isPrimary: asset.isPrimary,

      metadata: asset.metadata as Record<string, unknown> | null,

      version: asset.version,

      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,

      deletedAt: asset.deletedAt,
      archivedAt: asset.archivedAt,
    };
  }

  toResponseList(
    assets: CreativeAsset[],
  ): CreativeAssetResponseDto[] {
    return assets.map((asset) => this.toResponse(asset));
  }
}