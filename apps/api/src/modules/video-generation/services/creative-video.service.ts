import { Injectable, Logger } from '@nestjs/common';
import {
  CreativeAssetType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { StorageService } from '../../storage/services/storage.service';
import type { GeneratedVideoAsset } from '../interfaces/generated-video-asset.interface';
import type { VideoGenerationResult } from '../interfaces/video-generation-result.interface';

@Injectable()
export class CreativeVideoService {
  private readonly logger = new Logger(CreativeVideoService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload a generated MP4 to Storage and return a session-storable descriptor.
   * Does not create a CreativeAsset yet (creativeId may not exist until Save Draft).
   */
  async persistGeneratedVideo(params: {
    organizationId: string;
    result: VideoGenerationResult;
    fileName?: string;
  }): Promise<GeneratedVideoAsset> {
    const originalFileName = params.fileName ?? 'product-ad.mp4';
    const upload = await this.storageService.upload(
      params.result.buffer,
      originalFileName,
      {
        directory: `organizations/${params.organizationId}/generated-videos`,
        mimeType: params.result.mimeType,
      },
    );

    return {
      url: upload.url,
      storageKey: upload.storageKey,
      storageProvider: upload.storageProvider,
      fileName: upload.fileName,
      originalFileName: upload.originalFileName,
      mimeType: upload.mimeType,
      extension: upload.extension,
      fileSize: upload.size,
      checksum: upload.checksum,
      durationSeconds: params.result.durationSeconds,
      width: params.result.width,
      height: params.result.height,
      thumbnailUrl: null,
    };
  }

  /**
   * Create CreativeAsset(VIDEO) for a draft Creative and set publisher metadata URLs.
   */
  async linkVideoAssetToCreative(params: {
    creativeId: string;
    adId?: string;
    media: GeneratedVideoAsset;
    currentUser: JwtPayload;
  }): Promise<void> {
    const { creativeId, adId, media, currentUser } = params;

    await this.prisma.creativeAsset.updateMany({
      where: {
        organizationId: currentUser.organizationId,
        creativeId,
        assetType: CreativeAssetType.VIDEO,
        deletedAt: null,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });

    await this.prisma.creativeAsset.create({
      data: {
        organizationId: currentUser.organizationId,
        creativeId,
        adId: adId || undefined,
        assetType: CreativeAssetType.VIDEO,
        storageProvider: media.storageProvider,
        fileName: media.fileName,
        originalFileName: media.originalFileName,
        storageKey: media.storageKey,
        url: media.url,
        thumbnailUrl: media.thumbnailUrl ?? undefined,
        mimeType: media.mimeType,
        extension: media.extension,
        checksum: media.checksum,
        width: media.width,
        height: media.height,
        fileSize: BigInt(media.fileSize),
        duration: media.durationSeconds,
        isPrimary: true,
        metadata: {
          source: 'video-generation',
          provider: 'simple',
        } as Prisma.InputJsonValue,
      },
    });

    const creative = await this.prisma.creative.findFirst({
      where: {
        id: creativeId,
        organizationId: currentUser.organizationId,
        deletedAt: null,
      },
      select: { metadata: true },
    });

    if (!creative) {
      this.logger.warn(
        `Creative ${creativeId} not found when linking generated video.`,
      );
      return;
    }

    const metadata = {
      ...this.asRecord(creative.metadata),
      sourceVideoUrls: [media.url],
      videoUrl: media.url,
      videoMimeType: media.mimeType,
      thumbnailUrl: media.thumbnailUrl ?? undefined,
    };

    await this.prisma.creative.update({
      where: { id: creativeId },
      data: {
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private asRecord(value: Prisma.JsonValue | null): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...(value as Record<string, unknown>) };
    }
    return {};
  }
}
