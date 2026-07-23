import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { AdSetsController } from './controllers/ad-sets.controller';
import { AdSetMapper } from './mappers/ad-set.mapper';
import { AdSetsService } from './services/ad-sets.service';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
  ],
  controllers: [AdSetsController],
  providers: [
    AdSetsService,
    AdSetMapper,
  ],
  exports: [AdSetsService],
})
export class AdSetsModule {}