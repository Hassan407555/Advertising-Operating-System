import { ConfigService } from '@nestjs/config';

import { StorageProviderType } from '../enums/storage-provider.enum';

import { StorageProvider } from '../interfaces/storage-provider.interface';

import { LocalStorageProvider } from '../providers/local/local-storage.provider';

export class StorageProviderFactory {
  static create(
    configService: ConfigService,
    localStorageProvider: LocalStorageProvider,
  ): StorageProvider {
    const provider =
      configService.get<StorageProviderType>(
        'storage.provider',
        StorageProviderType.LOCAL,
      );

    switch (provider) {
      case StorageProviderType.LOCAL:
        return localStorageProvider;

      case StorageProviderType.S3:
        throw new Error(
          'S3 storage provider has not been implemented.',
        );

      case StorageProviderType.R2:
        throw new Error(
          'Cloudflare R2 storage provider has not been implemented.',
        );

      case StorageProviderType.MINIO:
        throw new Error(
          'MinIO storage provider has not been implemented.',
        );

      case StorageProviderType.GCS:
        throw new Error(
          'Google Cloud Storage provider has not been implemented.',
        );

      case StorageProviderType.AZURE:
        throw new Error(
          'Azure Blob Storage provider has not been implemented.',
        );

      default:
        throw new Error(
          `Unsupported storage provider: ${provider}`,
        );
    }
  }
}