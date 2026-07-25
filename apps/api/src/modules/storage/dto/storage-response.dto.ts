import { ApiProperty } from '@nestjs/swagger';
import {
  CreativeAssetType,
  StorageProvider,
} from '@prisma/client';

export class StorageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  originalFileName: string;

  @ApiProperty()
  storageKey: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  extension: string;

  @ApiProperty({
    example: 1048576,
  })
  fileSize: number;

  @ApiProperty({
    enum: CreativeAssetType,
  })
  assetType: CreativeAssetType;

  @ApiProperty({
    enum: StorageProvider,
  })
  storageProvider: StorageProvider;

  @ApiProperty()
  createdAt: Date;
}