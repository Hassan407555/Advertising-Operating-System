import { Module } from '@nestjs/common';

import { AdAccountsModule } from '../ad-accounts/ad-accounts.module';
import { AdsModule } from '../ads/ads.module';
import { AdSetsModule } from '../ad-sets/ad-sets.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { CreativesModule } from '../creatives/creatives.module';

import { PublisherController } from './controllers/publisher.controller';
import { PublisherMapper } from './mappers/publisher.mapper';
import { MetaGraphClient } from './providers/meta/meta-graph.client';
import { MetaPublisherProvider } from './providers/meta/meta.publisher.provider';
import { PublisherRegistry } from './providers/publisher.registry';
import { PublisherService } from './services/publisher.service';

/**
 * Reusable publishing gateway.
 *
 * Platform adapters register into PublisherRegistry.
 * V1 includes Meta only (single-image ads + AI copy).
 */
@Module({
  imports: [
    CampaignsModule,
    AdSetsModule,
    AdsModule,
    CreativesModule,
    AdAccountsModule,
  ],
  controllers: [PublisherController],
  providers: [
    PublisherService,
    PublisherRegistry,
    PublisherMapper,
    MetaGraphClient,
    MetaPublisherProvider,
  ],
  exports: [PublisherService, PublisherRegistry],
})
export class PublisherModule {}
