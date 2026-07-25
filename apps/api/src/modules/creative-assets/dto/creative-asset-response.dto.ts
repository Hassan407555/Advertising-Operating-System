import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CreativeAssetType,
  StorageProvider,
} from '@prisma/client';

export class CreativeAssetResponseDto {
  @ApiProperty({
    example: 'cmf4q8w0n0001g8jv2u8m1c7a',
    description: 'Creative Asset ID',
  })
  id!: string;

  @ApiProperty({
    example: 'cmf4q8vzp0000g8jv7m0q5x21',
    description: 'Organization ID',
  })
  organizationId!: string;

  @ApiPropertyOptional({
    example: 'cmf4q8w0n0001g8jv2u8m1c7b',
    nullable: true,
    description: 'Associated Creative ID',
  })
  creativeId!: string | null;

  @ApiPropertyOptional({
    example: 'cmf4q8w0n0001g8jv2u8m1c7c',
    nullable: true,
    description: 'Associated Ad ID',
  })
  adId!: string | null;

  @ApiProperty({
    enum: CreativeAssetType,
    description: 'Asset type',
  })
  assetType!: CreativeAssetType;

  @ApiProperty({
    enum: StorageProvider,
    description: 'Storage provider',
  })
  storageProvider!: StorageProvider;

  @ApiProperty({
    example: 'banner.jpg',
    description: 'Stored file name',
  })
  fileName!: string;

  @ApiProperty({
    example: 'Summer Banner.jpg',
    description: 'Original uploaded file name',
  })
  originalFileName!: string;

  @ApiProperty({
    example: 'organizations/org_123/creative-assets/banner.jpg',
    description: 'Storage object key',
  })
  storageKey!: string;

  @ApiProperty({
    example: 'https://cdn.example.com/assets/banner.jpg',
    description: 'Public asset URL',
  })
  url!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/assets/banner-thumb.jpg',
    nullable: true,
    description: 'Thumbnail URL',
  })
  thumbnailUrl!: string | null;

  @ApiProperty({
    example: 'image/jpeg',
    description: 'MIME type',
  })
  mimeType!: string;

  @ApiProperty({
    example: 'jpg',
    description: 'File extension',
  })
  extension!: string;

  @ApiPropertyOptional({
    example:
      'd7f2f5db7b8dff8f57c7a90b96b0f54b9df1e57d0dc5dbcb8bdf9f1d95f3f0ab',
    nullable: true,
    description: 'SHA-256 checksum',
  })
  checksum!: string | null;

  @ApiPropertyOptional({
    example: 1920,
    nullable: true,
    description: 'Image width in pixels',
  })
  width!: number | null;

  @ApiPropertyOptional({
    example: 1080,
    nullable: true,
    description: 'Image height in pixels',
  })
  height!: number | null;

  @ApiPropertyOptional({
    example: 245871,
    nullable: true,
    description: 'File size in bytes (BigInt converted to number)',
  })
  fileSize!: number | null;

  @ApiPropertyOptional({
    example: 12.45,
    nullable: true,
    description: 'Duration in seconds (Decimal converted to number)',
  })
  duration!: number | null;

  @ApiProperty({
    example: 0,
    description: 'Display order',
  })
  displayOrder!: number;

  @ApiProperty({
    example: true,
    description: 'Whether this is the primary asset',
  })
  isPrimary!: boolean;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    description: 'Additional asset metadata',
    example: {
      colorSpace: 'sRGB',
      dpi: 300,
    },
  })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({
    example: 1,
    description: 'Optimistic locking version',
  })
  version!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Creation timestamp',
  })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Last update timestamp',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Soft deletion timestamp',
  })
  deletedAt!: Date | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Archive timestamp',
  })
  archivedAt!: Date | null;
}