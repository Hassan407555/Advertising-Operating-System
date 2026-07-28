import { Module } from '@nestjs/common';

import { AdAccountsModule } from '../ad-accounts/ad-accounts.module';
import { AdsModule } from '../ads/ads.module';
import { AdSetsModule } from '../ad-sets/ad-sets.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { CreativeAssetsModule } from '../creative-assets/creative-assets.module';
import { CreativesModule } from '../creatives/creatives.module';
import { PlatformConnectionsModule } from '../platform-connections/platform-connections.module';

import { PublisherController } from './controllers/publisher.controller';
import { PublisherMapper } from './mappers/publisher.mapper';
import { MetaGraphClient } from './providers/meta/meta-graph.client';
import { MetaPublisherProvider } from './providers/meta/meta.publisher.provider';
import { PublisherRegistry } from './providers/publisher.registry';
import { TikTokApiClient } from './providers/tiktok/tiktok-api.client';
import { TikTokPublisherProvider } from './providers/tiktok/tiktok.publisher.provider';
import { PublisherService } from './services/publisher.service';

/**
 * Reusable publishing gateway.
 *
 * Platform adapters register into PublisherRegistry.
 * V1 includes Meta + TikTok (single-image + single-video ads + AI copy).
 * TikTok IMAGE (SINGLE_IMAGE) is temporary compatibility; VIDEO is primary.
 */
@Module({
  imports: [
    CampaignsModule,
    AdSetsModule,
    AdsModule,
    CreativesModule,
    CreativeAssetsModule,
    AdAccountsModule,
    PlatformConnectionsModule,
  ],
  controllers: [PublisherController],
  providers: [
    PublisherService,
    PublisherRegistry,
    PublisherMapper,
    MetaGraphClient,
    MetaPublisherProvider,
    TikTokApiClient,
    TikTokPublisherProvider,
  ],
  exports: [PublisherService, PublisherRegistry],
})
export class PublisherModule {}
