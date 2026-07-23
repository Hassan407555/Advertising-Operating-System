import { Module } from '@nestjs/common';

import { PlatformCredentialsController } from './platform-credentials.controller';
import { PlatformCredentialsService } from './platform-credentials.service';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { PlatformCredentialMapper } from './mappers/platform-credential.mapper';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
  ],
  controllers: [PlatformCredentialsController],
  providers: [
    PlatformCredentialsService,
    PlatformCredentialMapper,
  ],
  exports: [PlatformCredentialsService],
})
export class PlatformCredentialsModule {}