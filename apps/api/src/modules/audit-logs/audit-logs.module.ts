import { Module } from '@nestjs/common';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { AuditLogsService } from './services/audit-logs.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}