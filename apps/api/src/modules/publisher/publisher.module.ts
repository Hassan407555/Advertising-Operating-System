import { Module } from '@nestjs/common';

import { AdAccountsModule } from '../ad-accounts/ad-accounts.module';
import { AdsModule } from '../ads/ads.module';
import { AdSetsModule } from '../ad-sets/ad-sets.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { CreativeAssetsModule } from '../creative-assets/creative-assets.module';
import { CreativesModule } from '../creatives/creatives.module';
import { PlatformConnectionsModule } from '../platform-connections/platform-connections.module';
import { StoresModule } from '../stores/stores.module';

import { PublisherController } from './controllers/publisher.controller';
import { PublisherMapper } from './mappers/publisher.mapper';
import { MetaGraphClient } from './providers/meta/meta-graph.client';
import { MetaPublisherProvider } from './providers/meta/meta.publisher.provider';
import { PublisherRegistry } from './providers/publisher.registry';
import { PublisherService } from './services/publisher.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

/**
 * Reusable publishing gateway.
 *
 * Platform adapters register into PublisherRegistry.
 * V1 currently enables Meta only.
 */
@Module({
  imports: [
    PrismaModule,
    CampaignsModule,
    AdSetsModule,
    AdsModule,
    CreativesModule,
    CreativeAssetsModule,
    AdAccountsModule,
    PlatformConnectionsModule,
    StoresModule,
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
