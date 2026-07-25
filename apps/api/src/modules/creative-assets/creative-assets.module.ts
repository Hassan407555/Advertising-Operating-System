import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StorageModule } from '../storage/storage.module';

import { CreativeAssetsController } from './creative-assets.controller';
import { CreativeAssetsService } from './creative-assets.service';

import { CreativeAssetMapper } from './mapper/creative-asset.mapper';

import { AssetUploadService } from './services/asset-upload.service';
import { ChecksumService } from './services/checksum.service';
import { FileValidationService } from './services/file-validation.service';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    AuditLogsModule,
  ],

  controllers: [
    CreativeAssetsController,
  ],

  providers: [
    CreativeAssetsService,

    AssetUploadService,
    FileValidationService,
    ChecksumService,

    CreativeAssetMapper,
  ],

  exports: [
    CreativeAssetsService,
    AssetUploadService,
    FileValidationService,
    ChecksumService,
    CreativeAssetMapper,
  ],
})
export class CreativeAssetsModule {}