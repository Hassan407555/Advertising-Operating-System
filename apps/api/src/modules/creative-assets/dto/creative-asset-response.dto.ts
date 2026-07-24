import {
  CreativeAssetType,
  StorageProvider,
} from '@prisma/client';

export class CreativeAssetResponseDto {
  id!: string;

  organizationId!: string;

  creativeId!: string | null;

  adId!: string | null;

  assetType!: CreativeAssetType;

  storageProvider!: StorageProvider;

  fileName!: string;

  originalFileName!: string;

  storageKey!: string;

  url!: string;

  thumbnailUrl!: string | null;

  mimeType!: string;

  extension!: string;

  checksum!: string | null;

  width!: number | null;

  height!: number | null;

  // BigInt -> number
  fileSize!: number | null;

  // Decimal -> number
  duration!: number | null;

  displayOrder!: number;

  isPrimary!: boolean;

  metadata!: Record<string, unknown> | null;

  version!: number;

  createdAt!: Date;

  updatedAt!: Date;

  deletedAt!: Date | null;

  archivedAt!: Date | null;
}