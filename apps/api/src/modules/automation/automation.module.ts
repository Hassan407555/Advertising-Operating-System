import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiCopyModule } from '../ai-copy/ai-copy.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { CampaignGeneratorModule } from '../campaign-generator/campaign-generator.module';
import { PublisherModule } from '../publisher/publisher.module';
import { SynchronizationModule } from '../synchronization/synchronization.module';

import { AutomationController } from './controllers/automation.controller';
import { GenerateAiCopyActionHandler } from './handlers/generate-ai-copy.action-handler';
import { GenerateCampaignActionHandler } from './handlers/generate-campaign.action-handler';
import { PublishCampaignActionHandler } from './handlers/publish-campaign.action-handler';
import { SynchronizeCampaignActionHandler } from './handlers/synchronize-campaign.action-handler';
import { AutomationMapper } from './mappers/automation.mapper';
import { AutomationActionRegistry } from './registry/automation-action.registry';
import { AutomationExecutorService } from './services/automation-executor.service';
import { AutomationPipelinesService } from './services/automation-pipelines.service';
import { AutomationRunService } from './services/automation-run.service';
import { AutomationService } from './services/automation.service';
import { AutomationTriggerService } from './services/automation-trigger.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditLogsModule,
    CampaignGeneratorModule,
    AiCopyModule,
    PublisherModule,
    SynchronizationModule,
  ],
  controllers: [AutomationController],
  providers: [
    AutomationPipelinesService,
    AutomationRunService,
    AutomationExecutorService,
    AutomationTriggerService,
    AutomationService,
    AutomationActionRegistry,
    AutomationMapper,
    GenerateCampaignActionHandler,
    GenerateAiCopyActionHandler,
    PublishCampaignActionHandler,
    SynchronizeCampaignActionHandler,
  ],
  exports: [
    AutomationPipelinesService,
    AutomationRunService,
    AutomationTriggerService,
    AutomationService,
    AutomationActionRegistry,
  ],
})
export class AutomationModule {}
