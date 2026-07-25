import { posix } from 'node:path';

import { DEFAULT_STORAGE_DIRECTORY } from '../constants/storage.constants';

import { FileNameUtil } from './file-name.util';
import { UploadOptions } from '../interfaces/upload-options.interface';

export class StorageKeyUtil {
  /**
   * Builds a normalized storage key.
   *
   * The generated storage key is provider-independent and
   * can be used by Local, S3, R2, MinIO, Azure and GCS.
   */
  static build(
    originalFileName: string,
    options: UploadOptions,
  ): string {
    const directory = this.normalize(
      options.directory ?? DEFAULT_STORAGE_DIRECTORY,
    );

    const fileName = options.fileName
      ? FileNameUtil.sanitize(options.fileName)
      : FileNameUtil.generate(originalFileName);

    return posix.join(
      directory,
      fileName,
    );
  }

  /**
   * Normalizes path separators to POSIX format.
   */
  static normalize(path: string): string {
    return path
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');
  }

  /**
   * Validates that a storage key is safe.
   */
  static isSafe(
    storageKey: string,
  ): boolean {
    const normalized = this.normalize(
      storageKey,
    );

    return (
      normalized.length > 0 &&
      !normalized.includes('..') &&
      !normalized.startsWith('/')
    );
  }

  /**
   * Returns the directory portion.
   */
  static directory(
    storageKey: string,
  ): string {
    return posix.dirname(
      this.normalize(storageKey),
    );
  }

  /**
   * Returns the filename portion.
   */
  static fileName(
    storageKey: string,
  ): string {
    return posix.basename(
      this.normalize(storageKey),
    );
  }
}