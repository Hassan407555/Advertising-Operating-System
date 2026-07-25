/**
 * Supported storage providers.
 *
 * NOTE:
 * Keep this enum synchronized with the Prisma StorageProvider enum.
 */
export enum StorageProviderType {
  LOCAL = 'LOCAL',

  S3 = 'S3',

  R2 = 'R2',

  MINIO = 'MINIO',

  GCS = 'GCS',

  AZURE = 'AZURE',
}