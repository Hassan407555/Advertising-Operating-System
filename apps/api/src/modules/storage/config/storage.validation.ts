import * as Joi from 'joi';

import { StorageProviderType } from '../enums/storage-provider.enum';

export const storageValidationSchema = Joi.object({
  STORAGE_PROVIDER: Joi.string()
    .valid(...Object.values(StorageProviderType))
    .default(StorageProviderType.LOCAL),

  /**
   * ------------------------------------------------------------------
   * Local Storage
   * ------------------------------------------------------------------
   */
  STORAGE_LOCAL_ROOT_DIRECTORY: Joi.string().default(
    './storage',
  ),

  STORAGE_LOCAL_PUBLIC_BASE_URL: Joi.string().default(
    '/storage',
  ),

  /**
   * ------------------------------------------------------------------
   * Amazon S3
   * ------------------------------------------------------------------
   */
  STORAGE_S3_REGION: Joi.string().allow(''),

  STORAGE_S3_BUCKET: Joi.string().allow(''),

  STORAGE_S3_ENDPOINT: Joi.string().allow(''),

  STORAGE_S3_ACCESS_KEY_ID: Joi.string().allow(''),

  STORAGE_S3_SECRET_ACCESS_KEY: Joi.string().allow(''),

  STORAGE_S3_FORCE_PATH_STYLE: Joi.boolean().default(
    false,
  ),

  /**
   * ------------------------------------------------------------------
   * Cloudflare R2
   * ------------------------------------------------------------------
   */
  STORAGE_R2_ACCOUNT_ID: Joi.string().allow(''),

  STORAGE_R2_BUCKET: Joi.string().allow(''),

  STORAGE_R2_ENDPOINT: Joi.string().allow(''),

  STORAGE_R2_ACCESS_KEY_ID: Joi.string().allow(''),

  STORAGE_R2_SECRET_ACCESS_KEY: Joi.string().allow(''),

  /**
   * ------------------------------------------------------------------
   * MinIO
   * ------------------------------------------------------------------
   */
  STORAGE_MINIO_ENDPOINT: Joi.string().default(
    'localhost',
  ),

  STORAGE_MINIO_PORT: Joi.number().default(
    9000,
  ),

  STORAGE_MINIO_USE_SSL: Joi.boolean().default(
    false,
  ),

  STORAGE_MINIO_BUCKET: Joi.string().allow(''),

  STORAGE_MINIO_ACCESS_KEY: Joi.string().allow(''),

  STORAGE_MINIO_SECRET_KEY: Joi.string().allow(''),

  /**
   * ------------------------------------------------------------------
   * Google Cloud Storage
   * ------------------------------------------------------------------
   */
  STORAGE_GCS_PROJECT_ID: Joi.string().allow(''),

  STORAGE_GCS_BUCKET: Joi.string().allow(''),

  STORAGE_GCS_KEY_FILENAME: Joi.string().allow(''),

  /**
   * ------------------------------------------------------------------
   * Azure Blob Storage
   * ------------------------------------------------------------------
   */
  STORAGE_AZURE_CONNECTION_STRING: Joi.string().allow(
    '',
  ),

  STORAGE_AZURE_CONTAINER: Joi.string().allow(''),
});