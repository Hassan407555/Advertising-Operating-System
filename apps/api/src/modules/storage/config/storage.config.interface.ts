import { StorageProviderType } from '../enums/storage-provider.enum';

export interface LocalStorageConfig {
  rootDirectory: string;
  publicBaseUrl: string;
}

export interface S3StorageConfig {
  region: string;
  bucket: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export interface R2StorageConfig {
  accountId: string;
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface MinioStorageConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

export interface GcsStorageConfig {
  projectId: string;
  bucket: string;
  keyFilename?: string;
}

export interface AzureStorageConfig {
  connectionString: string;
  container: string;
}

export interface StorageConfig {
  provider: StorageProviderType;

  local: LocalStorageConfig;

  s3: S3StorageConfig;

  r2: R2StorageConfig;

  minio: MinioStorageConfig;

  gcs: GcsStorageConfig;

  azure: AzureStorageConfig;
}