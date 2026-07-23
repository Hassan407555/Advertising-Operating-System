import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

import { AdAccountsController } from './ad-accounts.controller';
import { AdAccountsService } from './ad-accounts.service';
import { AdAccountMapper } from './mappers/ad-account.mapper';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
  ],
  controllers: [
    AdAccountsController,
  ],
  providers: [
    AdAccountsService,
    AdAccountMapper,
  ],
  exports: [
    AdAccountsService,
  ],
})
export class AdAccountsModule {}