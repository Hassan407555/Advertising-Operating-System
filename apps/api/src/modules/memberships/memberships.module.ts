import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { MembershipsController } from './controllers/memberships.controller';
import { MembershipsService } from './services/memberships.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}