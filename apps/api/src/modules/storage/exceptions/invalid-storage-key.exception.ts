import { HttpStatus } from '@nestjs/common';

import { StorageException } from './storage.exception';

/**
 * Thrown when a storage key is invalid.
 */
export class InvalidStorageKeyException extends StorageException {
  constructor(storageKey: string) {
    super(
      `Invalid storage key '${storageKey}'.`,
      HttpStatus.BAD_REQUEST,
    );
  }
}