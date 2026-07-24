import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { CreativeAssetsController } from './creative-assets.controller';
import { CreativeAssetsService } from './creative-assets.service';
import { CreativeAssetMapper } from './mapper/creative-asset.mapper';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
  ],
  controllers: [CreativeAssetsController],
  providers: [
    CreativeAssetsService,
    CreativeAssetMapper,
  ],
  exports: [CreativeAssetsService],
})
export class CreativeAssetsModule {}