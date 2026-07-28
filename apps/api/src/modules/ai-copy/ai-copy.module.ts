import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { AdsModule } from '../ads/ads.module';
import { AdSetsModule } from '../ad-sets/ad-sets.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { CreativesModule } from '../creatives/creatives.module';
import { ShopifyModule } from '../shopify/shopify.module';

import { AiCopyController } from './controllers/ai-copy.controller';
import { AiCopyMapper } from './mappers/ai-copy.mapper';
import { AiCopyPromptRegistrar } from './prompts/ai-copy-prompt.registrar';
import { AiCopyService } from './services/ai-copy.service';

@Module({
  imports: [
    AiModule,
    CampaignsModule,
    AdSetsModule,
    AdsModule,
    CreativesModule,
    ShopifyModule,
  ],
  controllers: [AiCopyController],
  providers: [
    AiCopyService,
    AiCopyMapper,
    AiCopyPromptRegistrar,
  ],
  exports: [AiCopyService],
})
export class AiCopyModule {}
