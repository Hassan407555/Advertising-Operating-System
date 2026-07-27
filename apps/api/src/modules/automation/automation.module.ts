import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';

import { AutomationController } from './controllers/automation.controller';
import { AutomationMapper } from './mappers/automation.mapper';
import { AutomationActionRegistry } from './registry/automation-action.registry';
import { AutomationExecutorService } from './services/automation-executor.service';
import { AutomationPipelinesService } from './services/automation-pipelines.service';
import { AutomationRunService } from './services/automation-run.service';
import { AutomationTriggerService } from './services/automation-trigger.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditLogsModule],
  controllers: [AutomationController],
  providers: [
    AutomationPipelinesService,
    AutomationRunService,
    AutomationExecutorService,
    AutomationTriggerService,
    AutomationActionRegistry,
    AutomationMapper,
  ],
  exports: [
    AutomationPipelinesService,
    AutomationRunService,
    AutomationTriggerService,
    AutomationActionRegistry,
  ],
})
export class AutomationModule {}
