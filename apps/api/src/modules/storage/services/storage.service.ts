import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';

import { STORAGE_PROVIDER_TOKEN } from '../constants/storage.constants';

import type { StorageProvider } from '../interfaces/storage-provider.interface';
import { UploadOptions } from '../interfaces/upload-options.interface';
import { UploadResult } from '../interfaces/upload-result.interface';
import { FileMetadata } from '../interfaces/file-metadata.interface';
import { SignedUrlOptions } from '../interfaces/signed-url-options.interface';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly provider: StorageProvider,
  ) {}

  /**
   * Upload a file from memory.
   */
  upload(
    buffer: Buffer,
    originalFileName: string,
    options: UploadOptions,
  ): Promise<UploadResult> {
    return this.provider.upload(
      buffer,
      originalFileName,
      options,
    );
  }

  /**
   * Upload a readable stream.
   */
  uploadStream(
    stream: Readable,
    originalFileName: string,
    options: UploadOptions,
  ): Promise<UploadResult> {
    return this.provider.uploadStream(
      stream,
      originalFileName,
      options,
    );
  }

  /**
   * Delete an object.
   */
  delete(storageKey: string): Promise<void> {
    return this.provider.delete(storageKey);
  }

  /**
   * Check whether an object exists.
   */
  exists(storageKey: string): Promise<boolean> {
    return this.provider.exists(storageKey);
  }

  /**
   * Copy an object.
   */
  copy(
    sourceStorageKey: string,
    destinationStorageKey: string,
  ): Promise<void> {
    return this.provider.copy(
      sourceStorageKey,
      destinationStorageKey,
    );
  }

  /**
   * Move an object.
   */
  move(
    sourceStorageKey: string,
    destinationStorageKey: string,
  ): Promise<void> {
    return this.provider.move(
      sourceStorageKey,
      destinationStorageKey,
    );
  }

  /**
   * Retrieve metadata.
   */
  getMetadata(
    storageKey: string,
  ): Promise<FileMetadata> {
    return this.provider.getMetadata(storageKey);
  }

  /**
   * Generate a public URL.
   */
  getPublicUrl(
    storageKey: string,
  ): Promise<string> {
    return this.provider.getPublicUrl(storageKey);
  }

  /**
   * Generate a signed URL.
   */
  getSignedUrl(
    storageKey: string,
    options: SignedUrlOptions,
  ): Promise<string> {
    return this.provider.getSignedUrl(
      storageKey,
      options,
    );
  }
}