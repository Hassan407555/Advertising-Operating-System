import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StoresModule } from '../stores/stores.module';
import { VideoGenerationModule } from '../video-generation/video-generation.module';
import { AiSessionsController } from './controllers/ai-sessions.controller';
import { ConversationManager } from './managers/conversation.manager';
import { AiOrchestrator } from './orchestrator/ai.orchestrator';
import { AiSessionManagerRegistry } from './orchestrator/ai-session-manager.registry';
import { AiSessionsService } from './services/ai-sessions.service';
import { MetaCampaignGeneratorService } from './services/meta-campaign-generator.service';
import { SaveDraftCampaignService } from './services/save-draft-campaign.service';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    AuditLogsModule,
    VideoGenerationModule,
    forwardRef(() => StoresModule),
  ],
  controllers: [AiSessionsController],
  providers: [
    AiSessionsService,
    AiOrchestrator,
    AiSessionManagerRegistry,
    ConversationManager,
    MetaCampaignGeneratorService,
    SaveDraftCampaignService,
  ],
  exports: [AiSessionsService, AiOrchestrator],
})
export class AiSessionsModule {}
