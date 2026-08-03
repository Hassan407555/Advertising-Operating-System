import { Logger, Module } from '@nestjs/common';

import { isMetaTestMode } from '../../infrastructure/config/meta-test-mode';

import { SynchronizationController } from './controllers/synchronization.controller';
import { SynchronizationMapper } from './mappers/synchronization.mapper';
import { MetaSyncClient } from './providers/meta/meta-sync.client';
import { MetaSyncSimulatorClient } from './providers/meta/meta-sync.simulator.client';
import { MetaSynchronizationProvider } from './providers/meta/meta.synchronization.provider';
import { TikTokSyncClient } from './providers/tiktok/tiktok-sync.client';
import { TikTokSynchronizationProvider } from './providers/tiktok/tiktok.synchronization.provider';
import { SynchronizationPersistenceService } from './services/synchronization-persistence.service';
import { SynchronizationRegistryService } from './services/synchronization-registry.service';
import { SynchronizationService } from './services/synchronization.service';

const syncModuleLogger = new Logger('SynchronizationModule');

/**
 * Pulls campaign graph state + metrics from advertising platforms.
 *
 * Business modules → SynchronizationService → Registry → Meta/TikTok providers.
 * Explicit request only (no webhooks / queues / schedulers in V1).
 * Also invoked inline after a successful live Meta publish.
 */
@Module({
  controllers: [SynchronizationController],
  providers: [
    SynchronizationService,
    SynchronizationRegistryService,
    SynchronizationPersistenceService,
    SynchronizationMapper,
    {
      provide: MetaSyncClient,
      useFactory: () => {
        if (isMetaTestMode()) {
          syncModuleLogger.warn(
            'META_TEST_MODE enabled — using MetaSyncSimulatorClient (no Graph API calls).',
          );
          return new MetaSyncSimulatorClient();
        }
        return new MetaSyncClient();
      },
    },
    MetaSynchronizationProvider,
    TikTokSyncClient,
    TikTokSynchronizationProvider,
  ],
  exports: [SynchronizationService, SynchronizationRegistryService],
})
export class SynchronizationModule {}
