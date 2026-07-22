import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

import { AuditLogsController } from './controllers/audit-logs.controller';
import { AuditLogsService } from './services/audit-logs.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService], // <-- REQUIRED
})
export class AuditLogsModule {}
