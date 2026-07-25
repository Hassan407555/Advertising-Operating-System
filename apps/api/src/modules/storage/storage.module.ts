import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { STORAGE_PROVIDER_TOKEN } from './constants/storage.constants';

import { StorageService } from './services/storage.service';

import { StorageProviderFactory } from './factories/storage-provider.factory';

import { LocalStorageProvider } from './providers/local/local-storage.provider';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { StorageController } from './controllers/storage.controller';

import { StorageAssetsService } from './services/storage-assets.service';

import { StorageMapper } from './mappers/storage.mapper';

@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuditLogsModule,
  ],

  controllers: [
    StorageController,
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
    StorageAssetsService,
    StorageMapper,
  ],

  exports: [
    StorageService,
    STORAGE_PROVIDER_TOKEN,
  ],
})

export class StorageModule {}