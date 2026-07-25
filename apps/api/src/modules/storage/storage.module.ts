import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { STORAGE_PROVIDER_TOKEN } from './constants/storage.constants';

import { StorageService } from './services/storage.service';

import { StorageProviderFactory } from './factories/storage-provider.factory';

import { LocalStorageProvider } from './providers/local/local-storage.provider';

@Global()
@Module({
  imports: [
    ConfigModule,
  ],
  providers: [
    LocalStorageProvider,

    {
      provide: STORAGE_PROVIDER_TOKEN,
      inject: [
        ConfigService,
        LocalStorageProvider,
      ],
      useFactory: (
        configService: ConfigService,
        localStorageProvider: LocalStorageProvider,
      ) =>
        StorageProviderFactory.create(
          configService,
          localStorageProvider,
        ),
    },

    StorageService,
  ],
  exports: [
    StorageService,
    STORAGE_PROVIDER_TOKEN,
  ],
})
export class StorageModule {}