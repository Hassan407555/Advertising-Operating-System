import { registerAs } from '@nestjs/config';

import { StorageProviderType } from '../enums/storage-provider.enum';

import type { StorageConfig } from './storage.config.interface';

export default registerAs(
  'storage',
  (): StorageConfig => ({
    provider: (process.env.STORAGE_PROVIDER ??
      StorageProviderType.LOCAL) as StorageProviderType,

    local: {
      rootDirectory:
        process.env.STORAGE_LOCAL_ROOT_DIRECTORY ??
        './storage',

      publicBaseUrl:
        process.env.STORAGE_LOCAL_PUBLIC_BASE_URL ??
        '/storage',
    },

    s3: {
      region:
        process.env.STORAGE_S3_REGION ?? '',

      bucket:
        process.env.STORAGE_S3_BUCKET ?? '',

      endpoint:
        process.env.STORAGE_S3_ENDPOINT,

      accessKeyId:
        process.env.STORAGE_S3_ACCESS_KEY_ID ?? '',

      secretAccessKey:
        process.env.STORAGE_S3_SECRET_ACCESS_KEY ?? '',

      forcePathStyle:
        process.env.STORAGE_S3_FORCE_PATH_STYLE ===
        'true',
    },

    r2: {
      accountId:
        process.env.STORAGE_R2_ACCOUNT_ID ?? '',

      bucket:
        process.env.STORAGE_R2_BUCKET ?? '',

      endpoint:
        process.env.STORAGE_R2_ENDPOINT ?? '',

      accessKeyId:
        process.env.STORAGE_R2_ACCESS_KEY_ID ?? '',

      secretAccessKey:
        process.env.STORAGE_R2_SECRET_ACCESS_KEY ??
        '',
    },

    minio: {
      endpoint:
        process.env.STORAGE_MINIO_ENDPOINT ??
        'localhost',

      port: Number(
        process.env.STORAGE_MINIO_PORT ?? 9000,
      ),

      useSSL:
        process.env.STORAGE_MINIO_USE_SSL ===
        'true',

      bucket:
        process.env.STORAGE_MINIO_BUCKET ?? '',

      accessKey:
        process.env.STORAGE_MINIO_ACCESS_KEY ??
        '',

      secretKey:
        process.env.STORAGE_MINIO_SECRET_KEY ??
        '',
    },

    gcs: {
      projectId:
        process.env.STORAGE_GCS_PROJECT_ID ?? '',

      bucket:
        process.env.STORAGE_GCS_BUCKET ?? '',

      keyFilename:
        process.env.STORAGE_GCS_KEY_FILENAME,
    },

    azure: {
      connectionString:
        process.env
          .STORAGE_AZURE_CONNECTION_STRING ?? '',

      container:
        process.env.STORAGE_AZURE_CONTAINER ??
        '',
    },
  }),
);