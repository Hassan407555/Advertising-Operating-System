import { Readable } from 'node:stream';

import { FileMetadata } from './file-metadata.interface';
import { SignedUrlOptions } from './signed-url-options.interface';
import { UploadOptions } from './upload-options.interface';
import { UploadResult } from './upload-result.interface';

/**
 * Contract implemented by every storage provider.
 */
export interface StorageProvider {
  /**
   * Upload a file from memory.
   */
  upload(
    buffer: Buffer,
    originalFileName: string,
    options: UploadOptions,
  ): Promise<UploadResult>;

  /**
   * Upload a readable stream.
   *
   * Intended for large files where buffering the entire
   * file in memory is undesirable.
   */
  uploadStream(
    stream: Readable,
    originalFileName: string,
    options: UploadOptions,
  ): Promise<UploadResult>;

  /**
   * Delete an object.
   */
  delete(storageKey: string): Promise<void>;

  /**
   * Check whether an object exists.
   */
  exists(storageKey: string): Promise<boolean>;

  /**
   * Copy an object.
   */
  copy(
    sourceStorageKey: string,
    destinationStorageKey: string,
  ): Promise<void>;

  /**
   * Move an object.
   */
  move(
    sourceStorageKey: string,
    destinationStorageKey: string,
  ): Promise<void>;

  /**
   * Retrieve metadata for an object.
   */
  getMetadata(
    storageKey: string,
  ): Promise<FileMetadata>;

  /**
   * Generate a public URL.
   */
  getPublicUrl(
    storageKey: string,
  ): Promise<string>;

  /**
   * Generate a signed URL.
   */
  getSignedUrl(
    storageKey: string,
    options: SignedUrlOptions,
  ): Promise<string>;
}