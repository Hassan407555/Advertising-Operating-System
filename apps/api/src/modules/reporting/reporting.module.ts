import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { ReportingController } from './controllers/reporting.controller';
import { ReportMapper } from './mappers/reporting.mapper';
import { ReportingService } from './services/reporting.service';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
  ],

  controllers: [
    ReportingController,
  ],

  providers: [
    ReportingService,
    ReportMapper,
  ],

  exports: [
    ReportingService,
  ],
})
export class ReportingModule {}