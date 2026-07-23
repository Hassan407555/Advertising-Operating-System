import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { AdMapper } from './mapper/ad.mapper';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
  ],
  controllers: [AdsController],
  providers: [
    AdsService,
    AdMapper,
  ],
  exports: [AdsService],
})
export class AdsModule {}