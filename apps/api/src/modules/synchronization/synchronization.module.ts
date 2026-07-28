import { Module } from '@nestjs/common';

import { SynchronizationController } from './controllers/synchronization.controller';
import { SynchronizationMapper } from './mappers/synchronization.mapper';
import { MetaSyncClient } from './providers/meta/meta-sync.client';
import { MetaSynchronizationProvider } from './providers/meta/meta.synchronization.provider';
import { TikTokSyncClient } from './providers/tiktok/tiktok-sync.client';
import { TikTokSynchronizationProvider } from './providers/tiktok/tiktok.synchronization.provider';
import { SynchronizationPersistenceService } from './services/synchronization-persistence.service';
import { SynchronizationRegistryService } from './services/synchronization-registry.service';
import { SynchronizationService } from './services/synchronization.service';

/**
 * Pulls campaign graph state + metrics from advertising platforms.
 *
 * Business modules → SynchronizationService → Registry → Meta/TikTok providers.
 * Explicit request only (no webhooks / queues / schedulers in V1).
 */
@Module({
  controllers: [SynchronizationController],
  providers: [
    SynchronizationService,
    SynchronizationRegistryService,
    SynchronizationPersistenceService,
    SynchronizationMapper,
    MetaSyncClient,
    MetaSynchronizationProvider,
    TikTokSyncClient,
    TikTokSynchronizationProvider,
  ],
  exports: [SynchronizationService, SynchronizationRegistryService],
})
export class SynchronizationModule {}
