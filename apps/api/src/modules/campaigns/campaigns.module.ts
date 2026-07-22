import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { CampaignsController } from './controllers/campaigns.controller';
import { CampaignMapper } from './mappers/campaign.mapper';
import { CampaignsService } from './services/campaigns.service';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
  ],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    CampaignMapper,
  ],
  exports: [CampaignsService],
})
export class CampaignsModule {}