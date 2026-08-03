import { Logger, Module } from '@nestjs/common';

import { AdAccountsModule } from '../ad-accounts/ad-accounts.module';
import { AdsModule } from '../ads/ads.module';
import { AdSetsModule } from '../ad-sets/ad-sets.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { CreativeAssetsModule } from '../creative-assets/creative-assets.module';
import { CreativesModule } from '../creatives/creatives.module';
import { PlatformConnectionsModule } from '../platform-connections/platform-connections.module';
import { StoresModule } from '../stores/stores.module';
import { SynchronizationModule } from '../synchronization/synchronization.module';

import { PublisherController } from './controllers/publisher.controller';
import { PublisherMapper } from './mappers/publisher.mapper';
import { MetaGraphClient } from './providers/meta/meta-graph.client';
import { MetaGraphSimulatorClient } from './providers/meta/meta-graph.simulator.client';
import { MetaPublisherProvider } from './providers/meta/meta.publisher.provider';
import { PublisherRegistry } from './providers/publisher.registry';
import { PublisherService } from './services/publisher.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { isMetaTestMode } from '../../infrastructure/config/meta-test-mode';

const publisherModuleLogger = new Logger('PublisherModule');

/**
 * Reusable publishing gateway.
 *
 * Platform adapters register into PublisherRegistry.
 * V1 currently enables Meta only.
 * Successful Meta publish triggers SynchronizationService for AnalyticsSnapshot.
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
    SynchronizationModule,
  ],
  controllers: [PublisherController],
  providers: [
    PublisherService,
    PublisherRegistry,
    PublisherMapper,
    {
      provide: MetaGraphClient,
      useFactory: () => {
        if (isMetaTestMode()) {
          publisherModuleLogger.warn(
            'META_TEST_MODE enabled — using MetaGraphSimulatorClient (no Graph API calls).',
          );
          return new MetaGraphSimulatorClient();
        }
        return new MetaGraphClient();
      },
    },
    MetaPublisherProvider,
  ],
  exports: [PublisherService, PublisherRegistry],
})
export class PublisherModule {}
