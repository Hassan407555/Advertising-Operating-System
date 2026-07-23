import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { CreativesController } from './creatives.controller';
import { CreativesService } from './creatives.service';
import { CreativeMapper } from './mappers/creative.mapper';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
  ],
  controllers: [
    CreativesController,
  ],
  providers: [
    CreativesService,
    CreativeMapper,
  ],
  exports: [
    CreativesService,
  ],
})
export class CreativesModule {}