import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { PlatformConnectionsController } from './platform-connections.controller';
import { PlatformConnectionsService } from './platform-connections.service';
import { PlatformConnectionMapper } from './mappers/platform-connection.mapper';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditLogsModule,
  ],
  controllers: [
    PlatformConnectionsController,
  ],
  providers: [
    PlatformConnectionsService,
    PlatformConnectionMapper,
  ],
  exports: [
    PlatformConnectionsService,
  ],
})
export class PlatformConnectionsModule {}