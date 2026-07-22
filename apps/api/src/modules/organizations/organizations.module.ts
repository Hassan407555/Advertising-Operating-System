import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { OrganizationsController } from './controllers/organizations.controller';
import { OrganizationsService } from './services/organizations.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
